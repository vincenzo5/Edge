import { describe, expect, it } from "vitest";
import {
  computeEquityPositionSize,
  equityPositionSizeErrorMessage,
} from "./equityPositionSize";

describe("computeEquityPositionSize", () => {
  it("sizes long positions from dollar risk and stop distance", () => {
    const result = computeEquityPositionSize({
      entry: 100,
      stop: 95,
      dollarRisk: 500,
    });

    expect(result).toEqual({
      ok: true,
      direction: "long",
      entryPrice: 100,
      stopPrice: 95,
      riskPerShare: 5,
      shares: 100,
      targetRiskDollars: 500,
      actualRiskDollars: 500,
      notional: 10_000,
    });
  });

  it("sizes short positions when stop is above entry", () => {
    const result = computeEquityPositionSize({
      entry: 100,
      stop: 105,
      dollarRisk: 250,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.direction).toBe("short");
    expect(result.shares).toBe(50);
    expect(result.actualRiskDollars).toBe(250);
  });

  it("floors shares and reports actual risk below target when needed", () => {
    const result = computeEquityPositionSize({
      entry: 100,
      stop: 97,
      dollarRisk: 500,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares).toBe(166);
    expect(result.actualRiskDollars).toBe(498);
  });

  it("works with absolute dollar risk mode values", () => {
    const result = computeEquityPositionSize({
      entry: 50,
      stop: 48,
      dollarRisk: 1000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares).toBe(500);
    expect(result.actualRiskDollars).toBe(1000);
  });

  it("rejects invalid prices", () => {
    expect(
      computeEquityPositionSize({ entry: 100, stop: 100, dollarRisk: 500 }),
    ).toEqual({ ok: false, reason: "invalid_prices" });
    expect(
      computeEquityPositionSize({ entry: 0, stop: 95, dollarRisk: 500 }),
    ).toEqual({ ok: false, reason: "invalid_prices" });
  });

  it("rejects missing risk budget", () => {
    expect(
      computeEquityPositionSize({ entry: 100, stop: 95, dollarRisk: null }),
    ).toEqual({ ok: false, reason: "missing_risk" });
    expect(
      computeEquityPositionSize({ entry: 100, stop: 95, dollarRisk: 0 }),
    ).toEqual({ ok: false, reason: "missing_risk" });
  });

  it("rejects zero shares after floor", () => {
    expect(
      computeEquityPositionSize({ entry: 100, stop: 50, dollarRisk: 10 }),
    ).toEqual({ ok: false, reason: "zero_shares" });
  });
});

describe("equityPositionSizeErrorMessage", () => {
  it("returns user-facing copy for each failure reason", () => {
    expect(equityPositionSizeErrorMessage("invalid_prices")).toMatch(/different/i);
    expect(equityPositionSizeErrorMessage("missing_risk")).toMatch(/risk budget/i);
    expect(equityPositionSizeErrorMessage("zero_shares")).toMatch(/0 shares/i);
  });
});
