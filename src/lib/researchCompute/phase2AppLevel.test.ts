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
    o: 100 + index,
    h: 101 + index,
    l: 99 + index,
    c: 100 + index * 0.5,
    v: 1000,
  }));
}

describe("Quant research runtime Phase 2 app-level", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-p2-"));
    process.env.EDGE_RESEARCH_ROOT = tempDir;
    vi.resetModules();

    const bars = makeBars(1_700_000_000_000, 50);
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

  it("create → run_signal_study returns compact metrics and Data block without OHLCV", async () => {
    const bars = makeBars(1_700_000_000_000, 50);
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

    const datasetId = (create.data as { datasetId: string }).datasetId;
    const trainToMs = bars[Math.floor(bars.length * 0.7)]!.t;

    const study = await executeTool(
      edgeToolRegistry,
      "run_signal_study",
      {
        datasetId,
        spec: {
          signal: {
            op: "cross_above",
            left: { op: "indicator", id: "ma", inputs: { period: 5 } },
            right: { op: "indicator", id: "ma", inputs: { period: 20 } },
          },
          horizonBars: 3,
          entryLagBars: 1,
          direction: "long",
          trainToMs,
        },
      },
      context,
    );

    expect(study.ok).toBe(true);
    if (!study.ok) return;

    expect(JSON.stringify(study.data)).not.toMatch(/candles/i);
    const summary = summarizeToolResult("run_signal_study", study);
    expect(summary.length).toBeLessThanOrEqual(100);

    const hint = toArtifactHint("run_signal_study", study);
    expect(hint?.type).toBe("researchProfile");
    if (hint?.type === "researchProfile") {
      expect(hint.title).toBe("Signal study");
    }

    const block = hint
      ? toolStepToDataBlock({
          callId: "app-level-p2",
          name: "run_signal_study",
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
