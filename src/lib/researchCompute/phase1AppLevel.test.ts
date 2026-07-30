import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeToolResult } from "@/lib/ai/agent/summarizeToolResult";
import { executeTool } from "@/lib/ai/adapters/execute";
import { edgeToolRegistry } from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/context";
import { toArtifactHint } from "@/lib/research/artifactHint";
import { toolStepToDataBlock } from "@/lib/copilot/chatBlockMapping";
import type { CandleResponse } from "@/lib/marketData/contracts/equities";
import { createDataResult } from "@/lib/marketData/contracts/result";

function makeBars(startT: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    t: startT + index * 86_400_000,
    o: 100,
    h: 101,
    l: 99,
    c: 100 + index * 0.1,
    v: 1000,
  }));
}

describe("Quant research runtime Phase 1 app-level", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-app-"));
    process.env.EDGE_RESEARCH_ROOT = tempDir;
    vi.resetModules();

    const bars = makeBars(1_700_000_000_000, 30);
    const marketData = {
      getCandles: vi.fn(async () =>
        createDataResult<CandleResponse>(
          {
            symbol: "AAPL",
            interval: "1d",
            candles: bars,
            hasMore: false,
          },
          "yahoo",
        ),
      ),
      searchSymbols: vi.fn(),
      getQuotes: vi.fn(),
      getFundamentals: vi.fn(),
      getOptionExpirations: vi.fn(),
      getOptionsChain: vi.fn(),
    };

    const { ResearchComputeService } = await import("@/lib/researchCompute/service");
    context = {
      clientSession: false,
      app: null,
      chart: null,
      watchlist: null,
      screener: null,
      risk: null,
      account: null,
      options: null,
      scriptLibrary: null,
      marketData: marketData as never,
      trading: null,
      journal: null,
      alerts: null,
      research: null,
      researchCompute: new ResearchComputeService(marketData as never),
    };
  });

  afterEach(() => {
    delete process.env.EDGE_RESEARCH_ROOT;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("create → profile returns compact metrics and Data block without OHLCV", async () => {
    const bars = makeBars(1_700_000_000_000, 30);
    const create = await executeTool(
      edgeToolRegistry,
      "create_research_dataset",
      {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      context,
    );

    expect(create.ok).toBe(true);
    if (!create.ok) return;

    expect(JSON.stringify(create.data)).not.toMatch(/candles/i);
    const datasetId = (create.data as { datasetId: string }).datasetId;
    const sources = (create.data as { provenance?: { sources?: string[] } }).provenance?.sources;
    expect(sources).toContain("yahoo");

    const profile = await executeTool(
      edgeToolRegistry,
      "profile_research_dataset",
      { datasetId },
      context,
    );

    expect(profile.ok).toBe(true);
    if (!profile.ok) return;

    expect(JSON.stringify(profile.data)).not.toMatch(/candles/i);
    const summary = summarizeToolResult("profile_research_dataset", profile);
    expect(summary.length).toBeLessThanOrEqual(100);

    const hint = toArtifactHint("profile_research_dataset", profile);
    expect(hint?.type).toBe("researchProfile");

    const block = hint
      ? toolStepToDataBlock({
          callId: "app-level",
          name: "profile_research_dataset",
          status: "done",
          summary,
          artifactHint: hint,
        })
      : null;

    expect(block?.kind).toBe("data");
    if (block?.kind === "data") {
      expect(block.shape === "table" || (block.entries?.length ?? 0) > 0).toBe(true);
    }
  });
});
