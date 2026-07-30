import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../context";
import {
  createResearchDatasetTool,
  getResearchArtifactTool,
  getResearchDatasetTool,
  getResearchJobTool,
  profileResearchDatasetTool,
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

  it("get_research_dataset/get_job/get_artifact delegate to port", async () => {
    const port = {
      createDataset: vi.fn(),
      getDataset: vi.fn().mockResolvedValue({ datasetId: "ds_test" }),
      profileDataset: vi.fn(),
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
