import { describe, it, expect } from "vitest";
import { rangeForTechnicalRule } from "./technicalMath";

describe("rangeForTechnicalRule", () => {
  it("uses 1y for golden cross and 52-week proximity", () => {
    expect(rangeForTechnicalRule({ kind: "goldenCross", fast: 50, slow: 200 })).toBe("1y");
    expect(rangeForTechnicalRule({ kind: "fiftyTwoWeekProximity", withinPct: 0.05 })).toBe("1y");
  });

  it("uses 3mo for RSI and short-period indicators", () => {
    expect(rangeForTechnicalRule({ kind: "rsi", period: 14 })).toBe("3mo");
    expect(
      rangeForTechnicalRule({
        kind: "indicator",
        indicator: "RSI",
        op: "<",
        threshold: 30,
      }),
    ).toBe("3mo");
  });

  it("uses 1y for MACD indicator rules", () => {
    expect(
      rangeForTechnicalRule({
        kind: "indicator",
        indicator: "MACD",
        series: "histogram",
        op: ">",
        threshold: 0,
      }),
    ).toBe("1y");
  });
});
