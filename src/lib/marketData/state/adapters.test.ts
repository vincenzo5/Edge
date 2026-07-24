import { describe, expect, it } from "vitest";
import { createDataResult } from "../contracts/result";
import {
  observationFromChartMeta,
  observationFromDataResult,
  projectToChartDataMeta,
  projectToDataResponseMeta,
} from "./adapters";

describe("delivery observation adapters", () => {
  it("maps DataResult timestamps to canonical observation fields", () => {
    const result = createDataResult([], "yahoo", {
      requestedAt: 1000,
      receivedAt: 1500,
      asOf: 1400,
      stale: true,
      warnings: ["TWS temporarily skipped"],
    });
    const observation = observationFromDataResult(result, "chart_candles");
    expect(observation.timestamps.attemptedAt).toBe(1000);
    expect(observation.timestamps.receivedAt).toBe(1500);
    expect(observation.timestamps.providerAsOf).toBe(1400);
    expect(observation.timestamps.lastSuccessAt).toBe(1500);
    expect(observation.dimensions.provenance).toBe("fallback");
  });

  it("round-trips DataResult through DataResponseMeta projection", () => {
    const result = createDataResult([], "tws", {
      requestedAt: 2000,
      receivedAt: 2100,
      stale: false,
    });
    const observation = observationFromDataResult(result, "watchlist_quotes");
    const meta = projectToDataResponseMeta(observation, result);
    expect(meta.source).toBe("tws");
    expect(meta.receivedAt).toBe(2100);
    expect(meta.stale).toBe(false);
    expect(meta.latencyMs).toBe(100);
  });

  it("maps ChartDataMeta lastUpdateAt to lastSuccessAt", () => {
    const observation = observationFromChartMeta(
      {
        source: "tws",
        asOf: 5000,
        lastUpdateAt: 6000,
        streaming: true,
      },
      "chart_candles",
    );
    expect(observation?.timestamps.lastSuccessAt).toBe(6000);
    expect(observation?.dimensions.transport).toBe("streaming");
    const chartMeta = projectToChartDataMeta(observation!);
    expect(chartMeta.lastUpdateAt).toBe(6000);
    expect(chartMeta.streaming).toBe(true);
  });
});
