import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeToolResult } from "@/lib/ai/agent/summarizeToolResult";
import { executeTool } from "@/lib/ai/adapters/execute";
import { edgeToolRegistry } from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/context";
import { strategyEvalSpecSchema } from "@/lib/researchCompute/contracts";
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

describe("Quant research runtime Phase 3 app-level", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-p3-"));
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

  it("rejects strategy spec missing fees via Zod", () => {
    const parsed = strategyEvalSpecSchema.safeParse({
      entry: { op: "gt", left: { op: "close" }, right: 100 },
      exit: { op: "gt", left: { op: "close" }, right: 200 },
      maxHoldBars: 10,
      fillTiming: "next_open",
      slippageBps: 5,
      sizing: { mode: "fixed_shares", shares: 10 },
    });
    expect(parsed.success).toBe(false);
  });

  it("create → run_strategy_evaluation returns compact metrics and Data block without OHLCV", async () => {
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

    const evaluation = await executeTool(
      edgeToolRegistry,
      "run_strategy_evaluation",
      {
        datasetId,
        spec: {
          entry: {
            op: "cross_above",
            left: { op: "indicator", id: "ma", inputs: { period: 5 } },
            right: { op: "indicator", id: "ma", inputs: { period: 20 } },
          },
          exit: {
            op: "cross_below",
            left: { op: "indicator", id: "ma", inputs: { period: 5 } },
            right: { op: "indicator", id: "ma", inputs: { period: 20 } },
          },
          direction: "long",
          entryLagBars: 1,
          maxHoldBars: 20,
          fillTiming: "next_open",
          feesBps: 10,
          slippageBps: 5,
          sizing: { mode: "fixed_shares", shares: 100 },
        },
      },
      context,
    );

    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;

    const payload = evaluation.data as {
      keyMetrics: Record<string, string | number>;
      artifactRefs: { kind: string }[];
    };

    expect(JSON.stringify(evaluation.data)).not.toMatch(/candles/i);
    expect(JSON.stringify(evaluation.data)).not.toMatch(/equityCurve/i);
    expect(payload.keyMetrics["Fees bps"]).toBe(10);
    expect(payload.artifactRefs.some((ref) => ref.kind === "equity_curve")).toBe(true);
    expect(payload.artifactRefs.some((ref) => ref.kind === "trades_table")).toBe(true);

    const summary = summarizeToolResult("run_strategy_evaluation", evaluation);
    expect(summary.length).toBeLessThanOrEqual(120);

    const hint = toArtifactHint("run_strategy_evaluation", evaluation);
    expect(hint?.type).toBe("researchProfile");
    if (hint?.type === "researchProfile") {
      expect(hint.title).toBe("Strategy evaluation");
    }

    const block = hint
      ? toolStepToDataBlock({
          callId: "app-level-p3",
          name: "run_strategy_evaluation",
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
