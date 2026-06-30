import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EquityCandle } from "../contracts/equities";
import type { FmpScreenerRow } from "../contracts/fmp";
import { clearMarketDataCacheForTests } from "../cache/dataCache";
import {
  applyDescriptiveFilters,
  formatUtcDate,
  getCandlesFromUniverseStore,
  mergeDailyBarsIntoStore,
  readUniverseDailyStore,
  resetUniverseStoreForTests,
  writeUniverseDailyStore,
} from "./universeDailyStore";

function candle(c: number, t: number): EquityCandle {
  return { t, o: c, h: c, l: c, c, v: 1 };
}

function descriptor(symbol: string, sector: string): FmpScreenerRow {
  return {
    symbol,
    name: symbol,
    price: 100,
    change: 1,
    changePercent: 1,
    exchange: "NASDAQ",
    volume: 1_000_000,
    sector,
    industry: "Software",
    country: "US",
    beta: 1,
    marketCap: 1_000_000_000,
    dividendYield: 0.01,
  };
}

describe("universeDailyStore", () => {
  beforeEach(() => {
    clearMarketDataCacheForTests();
    resetUniverseStoreForTests();
  });

  it("merges grouped daily bars and reads symbol history", () => {
    let store = { byDate: {}, tradingDates: [], asOf: Date.now() };
    store = mergeDailyBarsIntoStore(
      store,
      "2024-06-03",
      new Map([["AAPL", candle(190, 1)]]),
    );
    store = mergeDailyBarsIntoStore(
      store,
      "2024-06-04",
      new Map([["AAPL", candle(195, 2)]]),
    );
    writeUniverseDailyStore(store);

    const loaded = readUniverseDailyStore();
    const { candles, found } = getCandlesFromUniverseStore("AAPL", 2, loaded);
    expect(found).toBe(true);
    expect(candles.map((bar) => bar.c)).toEqual([190, 195]);
  });

  it("applyDescriptiveFilters filters sector locally", () => {
    const rows = [
      descriptor("AAPL", "Technology"),
      descriptor("XOM", "Energy"),
    ];
    const filtered = applyDescriptiveFilters(rows, { sector: "Technology", limit: 200 });
    expect(filtered.map((row) => row.symbol)).toEqual(["AAPL"]);
  });

  it("formatUtcDate returns YYYY-MM-DD", () => {
    expect(formatUtcDate(new Date("2024-06-03T15:00:00.000Z"))).toBe("2024-06-03");
  });
});

describe("fetchUniverseDescriptors", () => {
  beforeEach(() => {
    clearMarketDataCacheForTests();
    resetUniverseStoreForTests();
  });

  it("paginates FMP screener until short page", async () => {
    const { fetchUniverseDescriptors } = await import("./universeDailyStore");
    const page1 = Array.from({ length: 1000 }, (_, i) => descriptor(`S${i}`, "Technology"));
    const page2 = [descriptor("ZZZZ", "Technology")];
    const fmp = {
      isConfigured: () => true,
      runStockScreener: vi.fn(async (query: { offset?: number }) =>
        query.offset && query.offset > 0
          ? { rows: page2, warnings: [] }
          : { rows: page1, warnings: [] },
      ),
    };

    const result = await fetchUniverseDescriptors(fmp as never);
    expect(result.rows.length).toBe(1001);
    expect(fmp.runStockScreener).toHaveBeenCalledTimes(2);
  });
});
