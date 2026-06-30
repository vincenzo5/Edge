import { describe, it, expect } from "vitest";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import {
  computeFiftyTwoWeekHighDistancePct,
  computeRsiForLast,
  evaluateIndicatorRule,
  evaluateTechnicalRule,
  FIFTY_TWO_WEEK_LOOKBACK,
  technicalCacheFingerprint,
  technicalRuleFingerprint,
} from "./technicalMath";

function candlesFromCloses(closes: number[]): EquityCandle[] {
  return closes.map((close, index) => ({
    t: index,
    o: close,
    h: close,
    l: close,
    c: close,
    v: 1,
  }));
}

describe("technicalMath", () => {
  it("returns RSI 100 for monotonically rising closes", () => {
    const closes = Array.from({ length: 20 }, (_, index) => 100 + index);
    const rsi = computeRsiForLast(candlesFromCloses(closes), 14);
    expect(rsi).toBe(100);
  });

  it("returns RSI near 50 for alternating up/down closes", () => {
    const closes = Array.from({ length: 30 }, (_, index) => 100 + (index % 2 === 0 ? 1 : -1));
    const rsi = computeRsiForLast(candlesFromCloses(closes), 14);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThan(40);
    expect(rsi!).toBeLessThan(60);
  });

  it("evaluates golden cross when fast SMA is above slow SMA", () => {
    const closes = Array.from({ length: 220 }, (_, index) =>
      index < 180 ? 80 + index * 0.05 : 120 + (index - 180) * 0.8,
    );
    const passes = evaluateTechnicalRule(
      { kind: "goldenCross", fast: 50, slow: 200 },
      candlesFromCloses(closes),
    ).passes;
    expect(passes).toBe(true);
  });

  it("evaluates 52-week proximity within threshold", () => {
    const highs = Array.from({ length: FIFTY_TWO_WEEK_LOOKBACK }, () => 100);
    highs[highs.length - 1] = 100;
    const candles = highs.map((high, index) => ({
      t: index,
      o: high,
      h: high,
      l: high - 1,
      c: index === highs.length - 1 ? 97 : high - 2,
      v: 1,
    }));
    const distance = computeFiftyTwoWeekHighDistancePct(candles);
    expect(distance).toBeCloseTo(0.03, 5);
    expect(
      evaluateTechnicalRule(
        { kind: "fiftyTwoWeekProximity", withinPct: 0.05 },
        candles,
      ).passes,
    ).toBe(true);
  });

  it("filters RSI oversold and overbought thresholds", () => {
    const rising = candlesFromCloses(Array.from({ length: 20 }, (_, index) => 100 + index));
    const flat = candlesFromCloses(Array.from({ length: 20 }, () => 100));

    expect(
      evaluateTechnicalRule({ kind: "rsi", period: 14, max: 30 }, rising).passes,
    ).toBe(false);
    expect(
      evaluateTechnicalRule({ kind: "rsi", period: 14, min: 70 }, rising).passes,
    ).toBe(true);
    expect(
      evaluateTechnicalRule({ kind: "rsi", period: 14, max: 30 }, flat).passes,
    ).toBe(false);
  });

  it("evaluates MACD histogram indicator rule via chart plugin registry", () => {
    const closes = Array.from({ length: 80 }, (_, index) => 100 + index * 0.5);
    const candles = candlesFromCloses(closes);
    const result = evaluateIndicatorRule(
      {
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      candles,
    );
    expect(result.value).not.toBeNull();
    expect(result.passes).toBe(result.value! > 0);
    expect(result.seriesKey).toBe("histogram");
  });

  it("evaluates Bollinger %B transform", () => {
    const candles = candlesFromCloses(Array.from({ length: 40 }, () => 100));
    candles[candles.length - 1] = {
      ...candles[candles.length - 1]!,
      c: 102,
      h: 102,
      l: 98,
    };
    const result = evaluateIndicatorRule(
      {
        kind: "indicator",
        indicator: "BOLL",
        inputs: { period: 20, std: 2 },
        series: "middle",
        bar: "last",
        op: ">",
        threshold: 0.5,
        transform: { kind: "bollPctB" },
      },
      candles,
    );
    expect(result.seriesKey).toBe("bollPctB");
    expect(result.value).not.toBeNull();
  });

  it("stable indicator rule fingerprint ignores input key order", () => {
    const a = technicalRuleFingerprint({
      kind: "indicator",
      indicator: "RSI",
      inputs: { period: 14, foo: 1 },
      series: "rsi",
      bar: "last",
      op: "<=",
      threshold: 30,
    });
    const b = technicalRuleFingerprint({
      kind: "indicator",
      indicator: "RSI",
      inputs: { foo: 1, period: 14 },
      series: "rsi",
      bar: "last",
      op: "<=",
      threshold: 30,
    });
    expect(a).toBe(b);
  });

  it("cache fingerprint changes when candle values change", () => {
    const rule = { kind: "rsi" as const, period: 14, max: 30 };
    const base = candlesFromCloses(Array.from({ length: 20 }, () => 100));
    const updated = [...base];
    updated[updated.length - 1] = { ...updated[updated.length - 1]!, c: 120 };
    expect(technicalCacheFingerprint(rule, base)).not.toBe(
      technicalCacheFingerprint(rule, updated),
    );
  });
});
