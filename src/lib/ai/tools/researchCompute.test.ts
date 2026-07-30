import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../context";
import {
  createResearchDatasetTool,
  getResearchArtifactTool,
  getResearchDatasetTool,
  getResearchJobTool,
  profileResearchDatasetTool,
  runSignalStudyTool,
  runStrategyEvaluationTool,
} from "./researchCompute";

function mockContext(port: NonNullable<ToolContext["researchCompute"]>): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary: null,
    marketData: {
      searchSymbols: vi.fn(),
      getCandles: vi.fn(),
      getQuotes: vi.fn(),
      getFundamentals: vi.fn(),
      getOptionExpirations: vi.fn(),
      getOptionsChain: vi.fn(),
    },
    trading: null,
    journal: null,
    alerts: null,
    research: null,
    researchCompute: port,
  };
}

describe("researchCompute tools", () => {
  it("create_research_dataset returns compact summary without candles", async () => {
    const port = {
      createDataset: vi.fn().mockResolvedValue({
        datasetId: "ds_test",
        created: true,
        manifest: {
          datasetId: "ds_test",
          identity: {
            symbols: ["AAPL"],
            interval: "1d",
            fromMs: 1,
            toMs: 2,
            provider: "auto",
            adjustment: "split",
            timezone: "UTC",
          },
          identityFingerprint: "fp1",
          contentFingerprint: "fp2",
          acquisitionMeta: {
            providerRoute: "auto",
            sources: ["yahoo"],
            warnings: [],
            rowCount: 100,
            paginationPages: 1,
          },
          materializedAt: new Date().toISOString(),
          computeVersion: "1.0.0",
          acquisitionPolicyVersion: "1",
          symbolRowCounts: { AAPL: 100 },
        },
      }),
      getDataset: vi.fn(),
      profileDataset: vi.fn(),
      runSignalStudy: vi.fn(),
      runStrategyEvaluation: vi.fn(),
      getJob: vi.fn(),
      getArtifact: vi.fn(),
    };

    const result = await createResearchDatasetTool.execute(
      {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: 1,
        toMs: 2,
      },
      mockContext(port),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({ datasetId: "ds_test", rowCount: 100 });
      expect(JSON.stringify(result.data)).not.toMatch(/candles/i);
    }
  });

  it("profile_research_dataset returns compact metrics", async () => {
    const port = {
      createDataset: vi.fn(),
      getDataset: vi.fn(),
      profileDataset: vi.fn().mockResolvedValue({
        jobId: "job_1",
        status: "succeeded",
        runFingerprint: "run_fp",
        warnings: [],
        keyMetrics: { Symbols: 1, "Total bars": 50 },
        artifactRefs: [{ artifactId: "art_1", kind: "metrics_json" }],
        previewTable: { columns: ["Symbol"], rows: [["AAPL"]] },
      }),
      runSignalStudy: vi.fn(),
      runStrategyEvaluation: vi.fn(),
      getJob: vi.fn(),
      getArtifact: vi.fn(),
    };

    const result = await profileResearchDatasetTool.execute(
      { datasetId: "ds_test" },
      mockContext(port),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.keyMetrics["Total bars"]).toBe(50);
    }
  });

  it("run_signal_study returns compact metrics", async () => {
    const port = {
      createDataset: vi.fn(),
      getDataset: vi.fn(),
      profileDataset: vi.fn(),
      runSignalStudy: vi.fn().mockResolvedValue({
        jobId: "job_2",
        status: "succeeded",
        runFingerprint: "run_fp2",
        warnings: [],
        keyMetrics: {
          "train.eventCount": 12,
          "holdout.hitRate": "55.00%",
          "holdout.meanForwardReturn": "1.20%",
        },
        artifactRefs: [{ artifactId: "art_2", kind: "metrics_json" }],
        previewTable: { columns: ["Symbol"], rows: [["AAPL"]] },
      }),
      runStrategyEvaluation: vi.fn(),
      getJob: vi.fn(),
      getArtifact: vi.fn(),
    };

    const result = await runSignalStudyTool.execute(
      {
        datasetId: "ds_test",
        spec: {
          signal: { op: "gt", left: { op: "close" }, right: 100 },
          horizonBars: 5,
          trainToMs: 1_700_000_000_000,
        },
      },
      mockContext(port),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.keyMetrics["train.eventCount"]).toBe(12);
    }
  });

  it("run_strategy_evaluation returns compact metrics", async () => {
    const port = {
      createDataset: vi.fn(),
      getDataset: vi.fn(),
      profileDataset: vi.fn(),
      runSignalStudy: vi.fn(),
      runStrategyEvaluation: vi.fn().mockResolvedValue({
        jobId: "job_3",
        status: "succeeded",
        runFingerprint: "run_fp3",
        warnings: ["Vectorized research — not broker-accurate event-driven simulation"],
        keyMetrics: {
          "Trade count": 5,
          "Total return": "3.50%",
          "Max drawdown": "1.20%",
          "Fees paid": 25,
        },
        artifactRefs: [
          { artifactId: "art_3", kind: "metrics_json" },
          { artifactId: "art_4", kind: "trades_table" },
          { artifactId: "art_5", kind: "equity_curve" },
        ],
        previewTable: { columns: ["Symbol"], rows: [["AAPL"]] },
      }),
      getJob: vi.fn(),
      getArtifact: vi.fn(),
    };

    const result = await runStrategyEvaluationTool.execute(
      {
        datasetId: "ds_test",
        spec: {
          entry: { op: "gt", left: { op: "close" }, right: 100 },
          exit: { op: "gt", left: { op: "close" }, right: 200 },
          maxHoldBars: 10,
          fillTiming: "next_open",
          feesBps: 10,
          slippageBps: 5,
          sizing: { mode: "fixed_shares", shares: 100 },
        },
      },
      mockContext(port),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.keyMetrics["Trade count"]).toBe(5);
      expect(JSON.stringify(result.data)).not.toMatch(/equityCurve/i);
    }
  });

  it("get_research_dataset/get_job/get_artifact delegate to port", async () => {
    const port = {
      createDataset: vi.fn(),
      getDataset: vi.fn().mockResolvedValue({ datasetId: "ds_test" }),
      profileDataset: vi.fn(),
      runSignalStudy: vi.fn(),
      runStrategyEvaluation: vi.fn(),
      getJob: vi.fn().mockResolvedValue({ jobId: "job_1", status: "succeeded" }),
      getArtifact: vi.fn().mockResolvedValue({ artifactId: "art_1", kind: "metrics_json" }),
    };

    await getResearchDatasetTool.execute({ datasetId: "ds_test" }, mockContext(port));
    await getResearchJobTool.execute({ jobId: "job_1" }, mockContext(port));
    await getResearchArtifactTool.execute({ artifactId: "art_1" }, mockContext(port));

    expect(port.getDataset).toHaveBeenCalled();
    expect(port.getJob).toHaveBeenCalled();
    expect(port.getArtifact).toHaveBeenCalled();
  });
});
