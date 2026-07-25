import { describe, it, expect } from "vitest";
import {
  DEFAULT_REGRESSION_FACTOR,
  evaluateChartPerfBudgets,
  readChartPerfBudgetConfig,
} from "./chart-perf-budgets.ts";

describe("chart-perf-budgets", () => {
  it("reads strict mode from env", () => {
    expect(readChartPerfBudgetConfig({ CHART_PERF_BUDGET_STRICT: "1" }).strict).toBe(true);
    expect(readChartPerfBudgetConfig({}).strict).toBe(false);
  });

  it("flags resident-typical regression above factor", () => {
    const reference = {
      scenarios: [
        {
          scenario: "interaction-5k-crosshair-only",
          tag: "resident-typical",
          metrics: { p50FrameMs: 10, p95FrameMs: 20 },
        },
      ],
    };
    const current = {
      scenarios: [
        {
          scenario: "interaction-5k-crosshair-only",
          tag: "resident-typical",
          metrics: { p50FrameMs: 11, p95FrameMs: 22 },
        },
      ],
    };

    expect(
      evaluateChartPerfBudgets(reference, current, {
        regressionFactor: DEFAULT_REGRESSION_FACTOR,
        strict: false,
      }),
    ).toHaveLength(0);

    const breached = {
      scenarios: [
        {
          scenario: "interaction-5k-crosshair-only",
          tag: "resident-typical",
          metrics: { p50FrameMs: 11, p95FrameMs: 30 },
        },
      ],
    };
    const breaches = evaluateChartPerfBudgets(reference, breached, {
      regressionFactor: DEFAULT_REGRESSION_FACTOR,
      strict: true,
    });
    expect(breaches).toHaveLength(1);
    expect(breaches[0]?.metric).toBe("p95FrameMs");
  });

  it("ignores stress scenarios", () => {
    const reference = {
      scenarios: [
        {
          scenario: "interaction-100k-pan-only",
          tag: "stress",
          metrics: { p50FrameMs: 100, p95FrameMs: 500 },
        },
      ],
    };
    const current = {
      scenarios: [
        {
          scenario: "interaction-100k-pan-only",
          tag: "stress",
          metrics: { p50FrameMs: 1000, p95FrameMs: 5000 },
        },
      ],
    };
    expect(
      evaluateChartPerfBudgets(reference, current, {
        regressionFactor: DEFAULT_REGRESSION_FACTOR,
        strict: true,
      }),
    ).toHaveLength(0);
  });
});
