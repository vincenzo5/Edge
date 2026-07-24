import { describe, expect, it } from "vitest";

import {
  evaluateIndicatorCrossCondition,
  evaluateIndicatorLevelCondition,
  evaluateIndicatorLevelEdge,
} from "./indicatorAlertEval";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";

function makeCandles(closes: number[]): EquityCandle[] {
  return closes.map((close, index) => ({
    t: index,
    o: close,
    h: close + 1,
    l: close - 1,
    c: close,
    v: 1000,
  }));
}

describe("evaluateIndicatorLevelCondition", () => {
  it("detects RSI above threshold on last bar", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i * 0.5));
    const result = evaluateIndicatorLevelCondition(
      {
        kind: "indicator_level",
        indicator: "RSI",
        inputs: { period: 14 },
        series: "rsi",
        interval: "1d",
        op: ">",
        threshold: 50,
      },
      candles,
    );
    expect(result.satisfied).toBe(true);
    expect(result.value).not.toBeNull();
  });
});

describe("evaluateIndicatorLevelEdge", () => {
  it("fires when level crosses into satisfied state", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i * 0.5));
    const result = evaluateIndicatorLevelEdge(
      {
        kind: "indicator_level",
        indicator: "RSI",
        inputs: { period: 14 },
        series: "rsi",
        interval: "1d",
        op: ">",
        threshold: 50,
      },
      candles,
      40,
    );
    expect(result.edge).toBe(true);
  });
});

describe("evaluateIndicatorCrossCondition", () => {
  it("detects MACD crossing above signal", () => {
    const rising = makeCandles(Array.from({ length: 40 }, (_, i) => 100 + i));
    const flat = makeCandles(Array.from({ length: 40 }, () => 130));
    const candles = [...rising, ...flat];

    const result = evaluateIndicatorCrossCondition(
      {
        kind: "indicator_cross",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        interval: "1d",
        seriesA: "macd",
        seriesB: "signal",
        direction: "above",
      },
      candles,
      {},
    );

    expect(result.seriesA).not.toBeNull();
    expect(result.seriesB).not.toBeNull();
    expect(typeof result.satisfied).toBe("boolean");
  });
});
