import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { researchCodeSpecSchema } from "./contracts";
import { MockResearchWorkerExecutor, setResearchWorkerExecutorForTests } from "./dockerWorker";
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

describe("researchCompute runResearchCode", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-p4-"));
    process.env.EDGE_RESEARCH_ROOT = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    setResearchWorkerExecutorForTests(null);
    delete process.env.EDGE_RESEARCH_ROOT;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("rejects oversized source via Zod", () => {
    const parsed = researchCodeSpecSchema.safeParse({
      source: "x".repeat(40_000),
    });
    expect(parsed.success).toBe(false);
  });

  it("runs research code via mock worker and persists source_py artifact", async () => {
    const bars = makeBars(1_700_000_000_000, 20);
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
    };

    const mockExecutor = new MockResearchWorkerExecutor(() => ({
      status: "succeeded",
      keyMetrics: { "Row count": 20 },
      previewTable: { columns: ["Metric"], rows: [["rows", 20]] },
      warnings: [],
    }));

    const { materializeDataset } = await import("./materialize");
    const { ResearchComputeService, resetResearchComputeJobCounterForTests } = await import(
      "./service"
    );
    resetResearchComputeJobCounterForTests();

    const { manifest } = await materializeDataset({
      marketData: marketData as never,
      input: {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      resolvedProvider: "auto",
    });

    const service = new ResearchComputeService(marketData as never, mockExecutor);
    const result = await service.runResearchCode({
      datasetId: manifest.datasetId,
      spec: { source: "research.set_metrics({'Row count': 20})" },
    });

    expect(result.status).toBe("succeeded");
    expect(result.keyMetrics["Row count"]).toBe(20);
    expect(result.artifactRefs.some((ref) => ref.kind === "source_py")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/candles/i);
  });

  it("cancelJob marks running worker job canceled", async () => {
    const bars = makeBars(1_700_000_000_000, 10);
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
    };

    const mockExecutor = new MockResearchWorkerExecutor(async (args) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (args.signal?.aborted) {
        throw new Error("Research cell canceled");
      }
      return {
        status: "succeeded",
        keyMetrics: { Done: 1 },
        warnings: [],
      };
    });

    const { materializeDataset } = await import("./materialize");
    const { ResearchComputeService, resetResearchComputeJobCounterForTests } = await import(
      "./service"
    );
    resetResearchComputeJobCounterForTests();

    const { manifest } = await materializeDataset({
      marketData: marketData as never,
      input: {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      resolvedProvider: "auto",
    });

    const service = new ResearchComputeService(marketData as never, mockExecutor);
    const pending = service.runResearchCode({
      datasetId: manifest.datasetId,
      spec: { source: "pass" },
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    const jobsDir = path.join(tempDir, "jobs");
    const jobIds = readdirSync(jobsDir);
    expect(jobIds.length).toBeGreaterThan(0);

    const canceled = await service.cancelJob(jobIds[0]!);
    expect(canceled.status).toBe("canceled");

    await expect(pending).rejects.toThrow(/canceled/i);
  });
});
