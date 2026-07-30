import { describe, expect, it } from "vitest";

import type { ResearchJobRecord } from "./contracts";
import { exportResearchDraftFromJob } from "./exportResearchDraft";

function mockSignalJob(): ResearchJobRecord {
  return {
    jobId: "job_signal",
    toolName: "run_signal_study",
    status: "succeeded",
    datasetId: "ds_test",
    runFingerprint: "fp_signal",
    toolInput: {
      signal: { op: "gt", left: { op: "close" }, right: 100 },
      horizonBars: 5,
      trainToMs: 1_700_000_000_000,
    },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    compactResult: {
      jobId: "job_signal",
      status: "succeeded",
      runFingerprint: "fp_signal",
      warnings: [],
      keyMetrics: { "train.eventCount": 12 },
      artifactRefs: [],
    },
  };
}

describe("exportResearchDraftFromJob", () => {
  it("exports indicator_script draft from signal study", () => {
    const draft = exportResearchDraftFromJob(mockSignalJob());
    expect(draft.draftKind).toBe("indicator_script");
    expect(draft.source).toMatch(/Research signal draft/);
    expect(draft.signalSpec?.horizonBars).toBe(5);
    expect(draft.provenance.jobId).toBe("job_signal");
  });

  it("exports strategy_note draft from strategy evaluation", () => {
    const draft = exportResearchDraftFromJob({
      ...mockSignalJob(),
      jobId: "job_strat",
      toolName: "run_strategy_evaluation",
      runFingerprint: "fp_strat",
      toolInput: {
        entry: { op: "gt", left: { op: "close" }, right: 100 },
        exit: { op: "gt", left: { op: "close" }, right: 200 },
        maxHoldBars: 10,
        fillTiming: "next_open",
        feesBps: 10,
        slippageBps: 5,
        sizing: { mode: "fixed_shares", shares: 100 },
      },
      compactResult: {
        jobId: "job_strat",
        status: "succeeded",
        runFingerprint: "fp_strat",
        warnings: [],
        keyMetrics: { "Trade count": 3, "Total return": "2.1%" },
        artifactRefs: [],
      },
    });

    expect(draft.draftKind).toBe("strategy_note");
    expect(draft.source).toMatch(/Strategy research note/);
    expect(draft.strategySpec?.feesBps).toBe(10);
  });

  it("rejects unsupported tools", () => {
    expect(() =>
      exportResearchDraftFromJob({
        ...mockSignalJob(),
        toolName: "profile_research_dataset",
      }),
    ).toThrow(/not supported/i);
  });
});
