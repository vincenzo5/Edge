import { describe, it, expect } from "vitest";
import {
  indexGroupedDailyBars,
  mapMassiveGroupedBarToEquityCandle,
  mapMassiveSnapshotToScreenerRow,
  tradingDateToUtcMs,
} from "./mappers";

describe("mapMassiveGroupedBarToEquityCandle", () => {
  it("maps grouped daily bar with ticker T and fallback timestamp", () => {
    const dateStr = "2024-06-03";
    const candle = mapMassiveGroupedBarToEquityCandle(
      { T: "AAPL", o: 190, h: 195, l: 189, c: 194, v: 50_000_000, vw: 192.5 },
      { fallbackTimestampMs: tradingDateToUtcMs(dateStr) },
    );
    expect(candle).toEqual({
      t: tradingDateToUtcMs(dateStr),
      o: 190,
      h: 195,
      l: 189,
      c: 194,
      v: 50_000_000,
    });
  });

  it("maps custom bar with t timestamp", () => {
    const candle = mapMassiveGroupedBarToEquityCandle({
      t: 1_700_000_000_000,
      o: 100,
      h: 101,
      l: 99,
      c: 100.5,
      v: 1_000,
    });
    expect(candle?.t).toBe(1_700_000_000_000);
    expect(candle?.c).toBe(100.5);
  });

  it("returns null when OHLC incomplete", () => {
    expect(mapMassiveGroupedBarToEquityCandle({ o: 1, h: 2 } as never)).toBeNull();
  });

  it("preserves adjusted split semantics via numeric OHLC (adjusted=true upstream)", () => {
    const preSplit = mapMassiveGroupedBarToEquityCandle({
      t: 1_700_000_000_000,
      o: 50,
      h: 52,
      l: 49,
      c: 51,
      v: 10_000,
    });
    const postSplit = mapMassiveGroupedBarToEquityCandle({
      t: 1_700_086_400_000,
      o: 25,
      h: 26,
      l: 24.5,
      c: 25.5,
      v: 20_000,
    });
    expect(preSplit?.c).toBe(51);
    expect(postSplit?.c).toBe(25.5);
    expect(postSplit!.c / preSplit!.c).toBeCloseTo(0.5, 5);
  });
});

describe("indexGroupedDailyBars", () => {
  it("indexes bars by uppercase symbol", () => {
    const map = indexGroupedDailyBars(
      [
        { T: "aapl", o: 1, h: 2, l: 0.5, c: 1.5, v: 100 },
        { T: "MSFT", o: 10, h: 11, l: 9, c: 10.5, v: 200 },
      ],
      "2024-01-02",
    );
    expect(map.size).toBe(2);
    expect(map.get("AAPL")?.c).toBe(1.5);
    expect(map.get("MSFT")?.c).toBe(10.5);
  });
});

describe("mapMassiveSnapshotToScreenerRow", () => {
  it("maps snapshot ticker to FmpScreenerRow shape", () => {
    const row = mapMassiveSnapshotToScreenerRow({
      ticker: "nvda",
      todaysChange: 5,
      todaysChangePerc: 1.2,
      day: { c: 420, v: 30_000_000 },
      lastTrade: { p: 421 },
    });
    expect(row).toMatchObject({
      symbol: "NVDA",
      price: 421,
      change: 5,
      changePercent: 1.2,
      volume: 30_000_000,
      country: "US",
    });
  });
});
