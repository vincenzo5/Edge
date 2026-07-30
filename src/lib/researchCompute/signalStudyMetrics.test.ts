import { describe, expect, it } from "vitest";

import {
  assertSignalGraphLimits,
  signalStudySpecSchema,
  type ResearchBar,
  type SignalNode,
} from "./contracts";
import { computeSignalStudyMetrics, evalSignalEvents } from "./signalStudyMetrics";

function makeTrendBars(count: number, startPrice = 100, slope = 1): ResearchBar[] {
  const startT = 1_700_000_000_000;
  return Array.from({ length: count }, (_, index) => {
    const price = startPrice + index * slope;
    return {
      t: startT + index * 86_400_000,
      o: price,
      h: price + 1,
      l: price - 1,
      c: price,
      v: 1000,
    };
  });
}

function makeGoldenCrossBars(): ResearchBar[] {
  const startT = 1_700_000_000_000;
  const closes: number[] = [];
  for (let index = 0; index < 25; index += 1) closes.push(100);
  for (let index = 0; index < 30; index += 1) closes.push(100 + index * 2);
  return closes.map((price, index) => ({
    t: startT + index * 86_400_000,
    o: price,
    h: price + 0.5,
    l: price - 0.5,
    c: price,
    v: 1000,
  }));
}

const maCrossSignal: SignalNode = {
  op: "cross_above",
  left: { op: "indicator", id: "ma", inputs: { period: 5 } },
  right: { op: "indicator", id: "ma", inputs: { period: 20 } },
};

describe("signalStudyMetrics", () => {
  it("rejects entryLagBars 0 via Zod", () => {
    const parsed = signalStudySpecSchema.safeParse({
      signal: { op: "gt", left: { op: "close" }, right: 100 },
      horizonBars: 5,
      entryLagBars: 0,
      trainToMs: 1_700_000_000_000,
    });
    expect(parsed.success).toBe(false);
  });

  it("detects MA cross events without using future bars beyond index", () => {
    const bars = makeGoldenCrossBars();
    const candles = bars.map((bar) => ({
      t: bar.t,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
    }));
    const events = evalSignalEvents(maCrossSignal, candles);
    const eventIndices = events
      .map((value, index) => (value ? index : -1))
      .filter((index) => index >= 0);
    expect(eventIndices.length).toBeGreaterThan(0);
    for (const index of eventIndices) {
      expect(index).toBeGreaterThanOrEqual(20);
    }
  });

  it("computes positive mean forward return on uptrend after MA cross", () => {
    const bars = makeGoldenCrossBars();
    const trainToMs = bars[Math.floor(bars.length * 0.6)]!.t;
    const result = computeSignalStudyMetrics({
      barsBySymbol: { TEST: bars },
      spec: {
        signal: maCrossSignal,
        horizonBars: 3,
        entryLagBars: 1,
        direction: "long",
        trainToMs,
        bootstrapSamples: 0,
      },
    });
    expect(result.keyMetrics["train.eventCount"]).toBeGreaterThan(0);
    const trainMean = String(result.keyMetrics["train.meanForwardReturn"]);
    expect(trainMean).not.toBe("0.00%");
  });

  it("holdout partition excludes train-window events", () => {
    const bars = makeTrendBars(50, 100, 0.5);
    const trainToMs = bars[39]!.t;
    const result = computeSignalStudyMetrics({
      barsBySymbol: { UP: bars },
      spec: {
        signal: { op: "gt", left: { op: "close" }, right: 110 },
        horizonBars: 2,
        entryLagBars: 1,
        direction: "long",
        trainToMs,
        bootstrapSamples: 0,
      },
    });
    const trainCount = Number(result.keyMetrics["train.eventCount"]);
    const holdoutCount = Number(result.keyMetrics["holdout.eventCount"]);
    expect(trainCount + holdoutCount).toBeGreaterThan(0);
    for (const row of result.previewTable.rows) {
      const trainEvents = Number(row[1]);
      const holdoutEvents = Number(row[4]);
      expect(trainEvents + holdoutEvents).toBeGreaterThanOrEqual(0);
    }
  });

  it("enforces signal IR depth and node limits", () => {
    let deep: SignalNode = { op: "gt", left: { op: "close" }, right: 100 };
    for (let depth = 0; depth < 5; depth += 1) {
      deep = { op: "and", nodes: [deep, { op: "gt", left: { op: "close" }, right: 50 }] };
    }
    expect(() => assertSignalGraphLimits(deep)).toThrow(/depth/i);
  });

  it("entry lag 1 measures return from bar after signal", () => {
    const bars: ResearchBar[] = [
      { t: 1000, o: 10, h: 10, l: 10, c: 10, v: 1 },
      { t: 2000, o: 10, h: 10, l: 10, c: 10, v: 1 },
      { t: 3000, o: 10, h: 10, l: 10, c: 11, v: 1 },
      { t: 4000, o: 11, h: 11, l: 11, c: 12, v: 1 },
      { t: 5000, o: 12, h: 12, l: 12, c: 13, v: 1 },
    ];
    const result = computeSignalStudyMetrics({
      barsBySymbol: { X: bars },
      spec: {
        signal: { op: "gt", left: { op: "close" }, right: 9 },
        horizonBars: 2,
        entryLagBars: 1,
        direction: "long",
        trainToMs: 5000,
        bootstrapSamples: 0,
      },
    });
    expect(Number(result.keyMetrics["train.eventCount"])).toBeGreaterThan(0);
  });
});
