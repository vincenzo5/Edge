import { describe, expect, it } from "vitest";
import {
  OperationalMetricsWindow,
  type OperationalDeliverySample,
} from "./operationalMetrics";

function delivery(
  at: number,
  overrides: Partial<OperationalDeliverySample> = {},
): OperationalDeliverySample {
  return {
    kind: "delivery",
    at,
    datasetId: "chart_candles",
    success: true,
    fresh: true,
    fallback: false,
    partial: false,
    ...overrides,
  };
}

describe("OperationalMetricsWindow", () => {
  it("reports no_samples instead of false success", () => {
    const report = new OperationalMetricsWindow().report(10_000);
    expect(report.deliverySuccess).toMatchObject({
      status: "no_samples",
      samples: 0,
      ratio: null,
    });
    expect(report.recoveryTime.status).toBe("no_samples");
  });

  it("computes delivery, freshness, and partial-coverage ratios", () => {
    const metrics = new OperationalMetricsWindow();
    metrics.record(delivery(1_000));
    metrics.record(
      delivery(2_000, {
        success: false,
        fresh: false,
        partial: true,
      }),
    );

    const report = metrics.report(3_000);
    expect(report.deliverySuccess).toMatchObject({
      samples: 2,
      matching: 1,
      ratio: 0.5,
    });
    expect(report.freshnessCompliance.ratio).toBe(0.5);
    expect(report.partialCoverage.ratio).toBe(0.5);
  });

  it("measures fallback episodes and recovery duration", () => {
    const metrics = new OperationalMetricsWindow();
    metrics.record(delivery(1_000, { fallback: true }));
    metrics.record(delivery(1_500, { fallback: true }));
    metrics.record(delivery(4_000, { fallback: false }));
    metrics.record({
      kind: "recovery",
      at: 5_000,
      durationMs: 750,
      success: true,
    });

    const report = metrics.report(6_000);
    expect(report.fallbackDuration).toMatchObject({
      samples: 1,
      active: 0,
      p50Ms: 3_000,
      p95Ms: 3_000,
      maxMs: 3_000,
    });
    expect(report.recoveryTime.p50Ms).toBe(750);
  });

  it("bounds samples by count and time", () => {
    const metrics = new OperationalMetricsWindow(2, 1_000);
    metrics.record(delivery(1_000));
    metrics.record(delivery(1_500));
    metrics.record(delivery(2_000));

    expect(metrics.report(2_000).window.retainedSamples).toBe(2);
    expect(metrics.report(3_500).window.retainedSamples).toBe(0);
  });

  it("bounds fallback episodes during repeated provider alternation", () => {
    const maxSamples = 8;
    const metrics = new OperationalMetricsWindow(maxSamples, 60_000);
    for (let i = 0; i < 50; i++) {
      metrics.record(delivery(i * 2, { fallback: true }));
      metrics.record(delivery(i * 2 + 1, { fallback: false }));
    }

    expect(metrics.report(100).fallbackDuration.samples).toBeLessThanOrEqual(maxSamples);
  });

  it("reports failed recovery outcomes without including them in duration percentiles", () => {
    const metrics = new OperationalMetricsWindow();
    metrics.record({ kind: "recovery", at: 1_000, durationMs: 400, success: false });
    metrics.record({ kind: "recovery", at: 2_000, durationMs: 800, success: true });

    const report = metrics.report(3_000);
    expect(report.recoverySuccess).toMatchObject({
      samples: 2,
      matching: 1,
      ratio: 0.5,
    });
    expect(report.recoveryTime).toMatchObject({ samples: 1, p50Ms: 800 });
  });
});
