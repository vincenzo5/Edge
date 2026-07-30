import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("researchCompute materialize + profile", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-"));
    process.env.EDGE_RESEARCH_ROOT = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.EDGE_RESEARCH_ROOT;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("materializes parquet partitions and runs profile job", async () => {
    const bars = makeBars(1_700_000_000_000, 40);
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

    const { materializeDataset } = await import("./materialize");
    const { readDatasetManifest } = await import("./datasetStore");
    const { ResearchComputeService } = await import("./service");

    const { manifest, created } = await materializeDataset({
      marketData: marketData as never,
      input: {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      resolvedProvider: "auto",
    });

    expect(created).toBe(true);
    expect(manifest.acquisitionMeta.rowCount).toBe(40);

    const stored = readDatasetManifest(manifest.datasetId);
    expect(stored?.datasetId).toBe(manifest.datasetId);

    const service = new ResearchComputeService(marketData as never);
    const profile = await service.profileDataset({ datasetId: manifest.datasetId });

    expect(profile.status).toBe("succeeded");
    expect(profile.keyMetrics["Total bars"]).toBe(40);
    expect(profile.previewTable?.rows.length).toBe(1);
    expect(profile.artifactRefs.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(profile)).not.toMatch(/"candles"/);
  });
});
