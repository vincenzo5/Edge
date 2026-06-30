import { describe, it, expect } from "vitest";
import { getAllIndicators } from "@edge/chart-core";
import {
  formatTechnicalRuleSummary,
  validateIndicatorRule,
  validateScreenQueryTechnical,
} from "./validateIndicatorRule";

const registry = getAllIndicators();

describe("validateIndicatorRule", () => {
  it("accepts a valid MACD rule", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      registry,
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects unknown indicators", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "NOT_REAL",
        series: "rsi",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      registry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/not implemented/i);
    }
  });

  it("rejects unimplemented catalog indicators like SAR", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "SAR",
        series: "sar",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      registry,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects invalid series", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "RSI",
        inputs: { period: 14 },
        series: "histogram",
        bar: "last",
        op: "<=",
        threshold: 30,
      },
      registry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /series/i.test(e))).toBe(true);
    }
  });

  it("rejects out-of-range inputs", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "RSI",
        inputs: { period: 1 },
        series: "rsi",
        bar: "last",
        op: "<=",
        threshold: 30,
      },
      registry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /period/i.test(e))).toBe(true);
    }
  });

  it("rejects transform on non-BOLL indicators", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
        transform: { kind: "bollPctB" },
      },
      registry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /BOLL/i.test(e))).toBe(true);
    }
  });

  it("accepts BOLL transform", () => {
    const result = validateIndicatorRule(
      {
        kind: "indicator",
        indicator: "BOLL",
        inputs: { period: 20, std: 2 },
        series: "middle",
        bar: "last",
        op: ">",
        threshold: 0.8,
        transform: { kind: "bollPctB" },
      },
      registry,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("validateScreenQueryTechnical", () => {
  it("passes named kinds without registry validation", () => {
    expect(
      validateScreenQueryTechnical({ kind: "goldenCross", fast: 50, slow: 200 }, registry),
    ).toEqual({ ok: true });
  });
});

describe("formatTechnicalRuleSummary", () => {
  it("formats named and indicator rules", () => {
    expect(formatTechnicalRuleSummary({ kind: "goldenCross", fast: 50, slow: 200 })).toMatch(
      /Golden cross/i,
    );
    expect(
      formatTechnicalRuleSummary({
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
      }),
    ).toMatch(/MACD\(12,26,9\).*histogram > 0/);
  });
});
