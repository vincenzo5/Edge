import { describe, expect, it } from "vitest";

import type { ResearchJobRecord } from "./contracts";
import { compareResearchRuns } from "./compareRuns";

function mockJob(args: {
  jobId: string;
  runFingerprint: string;
  toolName: string;
  toolInput: unknown;
  keyMetrics: Record<string, string | number>;
  datasetId?: string;
}): ResearchJobRecord {
  return {
    jobId: args.jobId,
    toolName: args.toolName,
    status: "succeeded",
    datasetId: args.datasetId ?? "ds_test",
    runFingerprint: args.runFingerprint,
    toolInput: args.toolInput,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    compactResult: {
      jobId: args.jobId,
      status: "succeeded",
      runFingerprint: args.runFingerprint,
      datasetId: args.datasetId ?? "ds_test",
      warnings: [],
      keyMetrics: args.keyMetrics,
      artifactRefs: [],
    },
  };
}

describe("compareResearchRuns", () => {
  it("builds side-by-side metrics and parameter diffs", () => {
    const records = [
      mockJob({
        jobId: "job_a",
        runFingerprint: "fp_a",
        toolName: "run_signal_study",
        toolInput: { horizonBars: 5, entryLagBars: 1 },
        keyMetrics: { "train.eventCount": 10, "holdout.hitRate": "50%" },
      }),
      mockJob({
        jobId: "job_b",
        runFingerprint: "fp_b",
        toolName: "run_signal_study",
        toolInput: { horizonBars: 10, entryLagBars: 1 },
        keyMetrics: { "train.eventCount": 8, "holdout.hitRate": "62%" },
      }),
    ];

    const result = compareResearchRuns({
      refs: ["job_a", "job_b"],
      records,
    });

    expect(result.runCount).toBe(2);
    expect(result.sharedDataset).toBe(true);
    expect(result.sharedToolName).toBe(true);
    expect(result.previewTable?.columns).toEqual(["Metric", "job_a", "job_b"]);
    expect(result.parameterDiffs.some((diff) => diff.path === "horizonBars")).toBe(true);
    expect(result.keyMetrics["Runs compared"]).toBe(2);
  });

  it("warns when datasets differ", () => {
    const records = [
      mockJob({
        jobId: "job_a",
        runFingerprint: "fp_a",
        toolName: "run_signal_study",
        toolInput: {},
        keyMetrics: { "train.eventCount": 1 },
        datasetId: "ds_a",
      }),
      mockJob({
        jobId: "job_b",
        runFingerprint: "fp_b",
        toolName: "run_signal_study",
        toolInput: {},
        keyMetrics: { "train.eventCount": 2 },
        datasetId: "ds_b",
      }),
    ];

    const result = compareResearchRuns({ refs: ["job_a", "job_b"], records });
    expect(result.sharedDataset).toBe(false);
    expect(result.warnings.some((warning) => /different datasets/i.test(warning))).toBe(true);
  });
});
