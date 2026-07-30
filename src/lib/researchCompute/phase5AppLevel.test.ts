import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeToolResult } from "@/lib/ai/agent/summarizeToolResult";
import { executeTool } from "@/lib/ai/adapters/execute";
import { edgeToolRegistry } from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/context";
import { researchCardFromHint } from "@/lib/research/cardFromHint";
import { toArtifactHint } from "@/lib/research/artifactHint";
import { toolStepToDataBlock } from "@/lib/copilot/chatBlockMapping";
import type { CandleResponse } from "@/lib/marketData/contracts/equities";
import { createDataResult } from "@/lib/marketData/contracts/result";
import { writeJobRecord } from "@/lib/researchCompute/jobStore";

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

describe("Quant research runtime Phase 5 app-level", () => {
  let tempDir: string;
  let context: ToolContext;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-p5-"));
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

  it("compare → Data block; pin researchRun; export draft without script mutation", async () => {
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
    const baseSpec = {
      signal: {
        op: "cross_above" as const,
        left: { op: "indicator" as const, id: "ma" as const, inputs: { period: 5 } },
        right: { op: "indicator" as const, id: "ma" as const, inputs: { period: 20 } },
      },
      entryLagBars: 1,
      direction: "long" as const,
      trainToMs,
    };

    const studyA = await executeTool(
      edgeToolRegistry,
      "run_signal_study",
      { datasetId, spec: { ...baseSpec, horizonBars: 3 } },
      context,
    );
    const studyB = await executeTool(
      edgeToolRegistry,
      "run_signal_study",
      { datasetId, spec: { ...baseSpec, horizonBars: 5 } },
      context,
    );
    expect(studyA.ok && studyB.ok).toBe(true);
    if (!studyA.ok || !studyB.ok) return;

    const jobA = (studyA.data as { jobId: string; runFingerprint: string }).jobId;
    const fpB = (studyB.data as { runFingerprint: string }).runFingerprint;

    const compare = await executeTool(
      edgeToolRegistry,
      "compare_research_runs",
      { refs: [jobA, fpB] },
      context,
    );
    expect(compare.ok).toBe(true);
    if (!compare.ok) return;

    expect(JSON.stringify(compare.data)).not.toMatch(/candles/i);
    const compareSummary = summarizeToolResult("compare_research_runs", compare);
    expect(compareSummary.length).toBeLessThanOrEqual(120);

    const compareHint = toArtifactHint("compare_research_runs", compare);
    expect(compareHint?.type).toBe("researchCompare");
    const compareBlock = toolStepToDataBlock({
      toolName: "compare_research_runs",
      summary: compareSummary,
      ok: true,
      artifactHint: compareHint ?? undefined,
    });
    expect(compareBlock?.kind).toBe("data");

    const pinCard = researchCardFromHint(compareHint!, {
      threadId: "thread-1",
      messageId: "msg-1",
    });
    expect(pinCard.type).toBe("researchRun");
    if (pinCard.type === "researchRun") {
      expect(pinCard.toolName).toBe("compare_research_runs");
      expect(pinCard.summary.length).toBeGreaterThan(0);
    }

    const exportDraft = await executeTool(
      edgeToolRegistry,
      "export_research_draft",
      { ref: jobA },
      context,
    );
    expect(exportDraft.ok).toBe(true);
    if (!exportDraft.ok) return;

    const draft = exportDraft.data as { draftKind: string; source: string };
    expect(draft.draftKind).toBe("indicator_script");
    expect(draft.source).toMatch(/manual review required/i);
    expect(context.scriptLibrary).toBeNull();
  });

  it("persists toolInput on job records for compare diffs", async () => {
    const { readJobRecord } = await import("@/lib/researchCompute/jobStore");
    writeJobRecord({
      jobId: "job_persist",
      toolName: "run_signal_study",
      status: "succeeded",
      datasetId: "ds_x",
      runFingerprint: "fp_x",
      toolInput: { horizonBars: 7 },
      startedAt: new Date().toISOString(),
      compactResult: {
        jobId: "job_persist",
        status: "succeeded",
        runFingerprint: "fp_x",
        warnings: [],
        keyMetrics: { "train.eventCount": 1 },
        artifactRefs: [],
      },
    });

    mkdirSync(path.join(tempDir, "jobs", "job_persist2"), { recursive: true });
    writeFileSync(
      path.join(tempDir, "jobs", "job_persist2", "job.json"),
      JSON.stringify({
        jobId: "job_persist2",
        toolName: "run_signal_study",
        status: "succeeded",
        datasetId: "ds_x",
        runFingerprint: "fp_y",
        toolInput: { horizonBars: 9 },
        startedAt: new Date().toISOString(),
        compactResult: {
          jobId: "job_persist2",
          status: "succeeded",
          runFingerprint: "fp_y",
          warnings: [],
          keyMetrics: { "train.eventCount": 2 },
          artifactRefs: [],
        },
      }),
    );

    const compare = await executeTool(
      edgeToolRegistry,
      "compare_research_runs",
      { refs: ["job_persist", "job_persist2"] },
      context,
    );
    expect(compare.ok).toBe(true);
    if (!compare.ok) return;

    const record = readJobRecord("job_persist");
    expect(record?.toolInput).toEqual({ horizonBars: 7 });
    const diffs = (compare.data as { parameterDiffs: { path: string }[] }).parameterDiffs;
    expect(diffs.some((diff) => diff.path === "horizonBars")).toBe(true);
  });
});
