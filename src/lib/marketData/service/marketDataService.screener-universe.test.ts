import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMarketDataService,
  clearMarketDataCacheForTests,
} from "../service/marketDataService";
import * as universeStore from "../screenerUniverse/universeDailyStore";
import type { FmpScreenerRow } from "../contracts/fmp";

const fmp = {
  isConfigured: vi.fn(() => true),
  runStockScreener: vi.fn(async () => ({ rows: [], warnings: [] })),
};

const massive = {
  isConfigured: vi.fn(() => true),
  getDailyMarketSummary: vi.fn(async () => ({ bySymbol: new Map(), warnings: [] })),
  getAggregates: vi.fn(async () => ({ candles: [], warnings: [] })),
};

vi.mock("../providers/fmp/adapter", () => ({
  createFmpProvider: () => fmp,
}));

vi.mock("../providers/massive/adapter", () => ({
  createMassiveProvider: () => massive,
}));

vi.mock("../providers/tradier/adapter", () => ({
  createTradierOptionsProvider: () => ({ isConfigured: () => false }),
}));

vi.mock("../providers/sec/adapter", () => ({
  createSecProvider: () => ({ isConfigured: () => true, getRecentFilings: vi.fn(async () => []) }),
}));

vi.mock("../providers/ibkr/adapter", () => ({
  createIbkrProvider: () => ({ isConfigured: () => false }),
}));

vi.mock("../providers/tws/adapter", () => ({
  createTwsProvider: () => ({ isConfigured: () => false }),
}));

const yahoo = {
  searchSymbols: vi.fn(async () => []),
  getChartCandles: vi.fn(async () => []),
  getChartCandlesBefore: vi.fn(async () => []),
  getQuoteSnapshots: vi.fn(async () => []),
  getFundamentalsSnapshot: vi.fn(async () => null),
};

function descriptor(symbol: string): FmpScreenerRow {
  return {
    symbol,
    name: symbol,
    price: 100,
    change: 1,
    changePercent: 1,
    exchange: "NASDAQ",
    volume: 1_000_000,
    sector: "Technology",
    industry: "Software",
    country: "US",
    beta: 1,
    marketCap: 1_000_000_000,
    dividendYield: 0.01,
  };
}

describe("MarketDataService full-universe screener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarketDataCacheForTests();
    universeStore.resetUniverseStoreForTests();
    fmp.isConfigured.mockReturnValue(true);
    massive.isConfigured.mockReturnValue(true);

    const byDate: universeStore.UniverseDailyStorePayload["byDate"] = {};
    const tradingDates: string[] = [];
    for (let i = 0; i < 20; i += 1) {
      const date = `2024-05-${String(i + 1).padStart(2, "0")}`;
      tradingDates.push(date);
      byDate[date] = {
        PASS: {
          t: Date.parse(`${date}T00:00:00.000Z`),
          o: 100 - i,
          h: 100 - i,
          l: 100 - i,
          c: 100 - i,
          v: 1,
        },
        FAIL: {
          t: Date.parse(`${date}T00:00:00.000Z`),
          o: 100,
          h: 100,
          l: 100,
          c: 100,
          v: 1,
        },
      };
    }

    vi.spyOn(universeStore, "ensureScreenerUniverseWarm").mockResolvedValue({
      store: { byDate, tradingDates, asOf: Date.now() },
      warnings: [],
    });
    vi.spyOn(universeStore, "fetchUniverseDescriptors").mockResolvedValue({
      rows: [descriptor("PASS"), descriptor("FAIL")],
      warnings: [],
    });
  });

  it("uses Massive universe path for technical queries without FMP prefilter limit", async () => {
    const service = createMarketDataService({ yahoo });
    const query = {
      technical: { kind: "rsi" as const, period: 14, max: 30 },
      limit: 200,
    };
    const result = await service.getScreenerResults(query);

    expect(result.data.map((row) => row.symbol)).toEqual(["PASS"]);
    expect(universeStore.ensureScreenerUniverseWarm).toHaveBeenCalled();
    expect(universeStore.fetchUniverseDescriptors).toHaveBeenCalled();
    expect(yahoo.getChartCandles).not.toHaveBeenCalled();
  });
});
