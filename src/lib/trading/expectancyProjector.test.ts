import { describe, expect, it } from "vitest";

import {
  computeEvR,
  computeTradeCount,
  DEFAULT_EXPECTANCY_PARAMS,
  EXPECTANCY_PRESETS,
  projectDeterministic,
  projectMonteCarlo,
  streakDrawdown,
  validateExpectancyParams,
} from "./expectancyProjector";

describe("expectancyProjector", () => {
  it("computes EV in R-multiples", () => {
    expect(computeEvR({ winRate: 0.4, avgWinR: 2, avgLossR: 1 })).toBeCloseTo(0.2);
    expect(computeEvR({ winRate: 0.4, avgWinR: 3, avgLossR: 1 })).toBeCloseTo(0.6);
  });

  it("rejects invalid params", () => {
    expect(validateExpectancyParams({ winRate: 1.2 }).ok).toBe(false);
    expect(validateExpectancyParams({ riskFraction: 0 }).ok).toBe(false);
    expect(validateExpectancyParams({ startingEquity: -1 }).ok).toBe(false);
  });

  it("projects deterministic compound growth", () => {
    const params = {
      startingEquity: 10_000,
      years: 1,
      winRate: 0.5,
      avgWinR: 2,
      avgLossR: 1,
      riskFraction: 0.1,
      tradesPerWeek: 1,
    };
    const result = projectDeterministic(params);
    expect(result).not.toHaveProperty("ok", false);
    if ("ok" in result && result.ok === false) throw new Error(result.error);

    expect(result.tradeCount).toBe(52);
    expect(result.evR).toBeCloseTo(0.5);
    expect(result.endingEquity).toBeCloseTo(10_000 * 1.05 ** 52, -2);
    expect(result.multiple).toBeGreaterThan(1);
    expect(result.curvePoints.length).toBeGreaterThan(1);
  });

  it("matches aggressive preset order-of-magnitude over 9 years", () => {
    const preset = EXPECTANCY_PRESETS.find((item) => item.id === "aggressive_10pct")!;
    const result = projectDeterministic(preset);
    if ("ok" in result && result.ok === false) throw new Error(result.error);
    expect(result.multiple).toBeGreaterThan(100);
    expect(result.cagr).toBeGreaterThan(0.5);
  });

  it("estimates losing streak drawdown", () => {
    expect(streakDrawdown(0.1, 5)).toBeCloseTo(0.4095, 3);
    expect(streakDrawdown(0.01, 5)).toBeCloseTo(0.049, 2);
  });

  it("runs seeded Monte Carlo with stable median", () => {
    const resultA = projectMonteCarlo(DEFAULT_EXPECTANCY_PARAMS, { runs: 500, seed: 99 });
    const resultB = projectMonteCarlo(DEFAULT_EXPECTANCY_PARAMS, { runs: 500, seed: 99 });
    if ("ok" in resultA && resultA.ok === false) throw new Error(resultA.error);
    if ("ok" in resultB && resultB.ok === false) throw new Error(resultB.error);

    expect(resultA.medianEnding).toBeCloseTo(resultB.medianEnding, 6);
    expect(resultA.bandCurve.length).toBeGreaterThan(2);
    expect(resultA.ruinRate).toBeGreaterThanOrEqual(0);
    expect(resultA.ruinRate).toBeLessThanOrEqual(1);
  });

  it("computes trade count from horizon and frequency", () => {
    expect(computeTradeCount({ years: 9, tradesPerWeek: 1 })).toBe(468);
    expect(computeTradeCount({ years: 1, tradesPerWeek: 2 })).toBe(104);
  });
});
