import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMarketDataService,
  clearMarketDataCacheForTests,
} from "../service/marketDataService";
import * as universeStore from "../screenerUniverse/universeDailyStore";

const fmp = {
  isConfigured: vi.fn(() => true),
  getCompanyProfile: vi.fn(async () => ({
    profile: {
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      currency: "USD",
      sector: "Technology",
      industry: "Consumer Electronics",
      country: "US",
      website: "apple.com",
      description: "desc",
      ceo: "Tim Cook",
      beta: 1.1,
      marketCap: 1,
      price: 200,
      updatedAt: Date.now(),
    },
    warnings: [],
  })),
  getAnalystEstimates: vi.fn(async () => ({
    estimates: [{ symbol: "AAPL", date: "2026-06-30", revenueLow: null, revenueHigh: null, revenueAvg: 1, epsLow: null, epsHigh: null, epsAvg: 1, ebitdaLow: null, ebitdaHigh: null, ebitdaAvg: null }],
    warnings: [],
  })),
  getFinancialsBundle: vi.fn(async () => ({
    bundle: {
      symbol: "AAPL",
      period: "annual" as const,
      incomeStatements: [],
      balanceSheets: [],
      cashFlowStatements: [],
      keyMetrics: [],
      ratios: [],
      enterpriseValues: [],
    },
    warnings: [],
  })),
  getExecutives: vi.fn(async () => ({
    executives: [{ name: "Tim Cook", title: "CEO", pay: 1, currencyPay: "USD", gender: null, yearBorn: null }],
    warnings: [],
  })),
  getSecFilings: vi.fn(async () => ({
    filings: [{ symbol: "AAPL", cik: "1", formType: "10-K", filingDate: "2025-01-01", acceptedDate: null, url: null }],
    warnings: [],
  })),
  getMarketMovers: vi.fn(async () => ({
    movers: [{ symbol: "NVDA", name: "NVIDIA", price: 1, change: 1, changePercent: 1, exchange: "NASDAQ", volume: 1 }],
    warnings: [],
  })),
  runStockScreener: vi.fn(async () => ({
    rows: [{
      symbol: "MSFT",
      name: "Microsoft",
      price: 400,
      change: 2,
      changePercent: 0.5,
      exchange: "NASDAQ",
      volume: 10_000_000,
      sector: "Technology",
      industry: "Software",
      country: "US",
      beta: 1.1,
      marketCap: 3_000_000_000_000,
      dividendYield: 0.008,
    }],
    warnings: [],
  })),
  getCorporateEvents: vi.fn(async () => ({
    events: [{ id: "1", type: "earnings" as const, symbol: "AAPL", title: "AAPL earnings", source: "fmp" }],
    warnings: [],
  })),
  getNews: vi.fn(async () => ({
    news: [],
    warnings: ["FMP endpoint restricted (402): subscription required"],
  })),
};

vi.mock("../providers/fmp/adapter", () => ({
  createFmpProvider: () => fmp,
}));

vi.mock("../providers/massive/adapter", () => ({
  createMassiveProvider: () => ({ isConfigured: () => false }),
}));

vi.mock("../providers/tradier/adapter", () => ({
  createTradierOptionsProvider: () => ({ isConfigured: () => false }),
}));

vi.mock("../providers/sec/adapter", () => ({
  createSecProvider: () => ({
    isConfigured: () => true,
    getRecentFilings: vi.fn(async () => []),
  }),
}));

vi.mock("../providers/ibkr/adapter", () => ({
  createIbkrProvider: () => ({ isConfigured: () => false }),
}));

const yahoo = {
  searchSymbols: vi.fn(async () => []),
  getChartCandles: vi.fn(async () => []),
  getChartCandlesBefore: vi.fn(async () => []),
  getQuoteSnapshots: vi.fn(async () => []),
  getFundamentalsSnapshot: vi.fn(async () => null),
};

describe("MarketDataService FMP gap-fill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarketDataCacheForTests();
  });

  it("returns FMP profile with metadata", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getFmpCompanyProfile("AAPL");
    expect(result.source).toBe("fmp");
    expect(result.data?.name).toBe("Apple Inc.");
  });

  it("caches FMP estimates requests", async () => {
    const service = createMarketDataService({ yahoo });
    await service.getFmpAnalystEstimates({ symbol: "AAPL" });
    await service.getFmpAnalystEstimates({ symbol: "AAPL" });
    expect(fmp.getAnalystEstimates).toHaveBeenCalledTimes(1);
  });

  it("propagates restricted-endpoint warnings for news", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getNews({ symbol: "AAPL", limit: 3 });
    expect(result.data).toEqual([]);
    expect(result.warnings[0]).toContain("402");
  });

  it("returns corporate events including split support path", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getCorporateEvents({ symbol: "AAPL" });
    expect(result.data.some((event) => event.type === "earnings")).toBe(true);
    expect(result.source).toBe("fmp");
  });

  it("returns financials, executives, filings, and movers", async () => {
    const service = createMarketDataService({ yahoo });
    expect((await service.getFmpFinancials({ symbol: "AAPL" })).data.symbol).toBe("AAPL");
    expect((await service.getFmpExecutives("AAPL")).data[0]?.name).toBe("Tim Cook");
    expect((await service.getFmpSecFilings({ symbol: "AAPL" })).data[0]?.formType).toBe("10-K");
    expect((await service.getFmpMarketMovers({ kind: "gainers" })).data[0]?.symbol).toBe("NVDA");
  });

  it("enriches market movers with universe descriptors", async () => {
    vi.spyOn(universeStore, "fetchUniverseDescriptors").mockResolvedValue({
      rows: [
        {
          symbol: "NVDA",
          name: "NVIDIA Corporation",
          price: 120,
          change: 5,
          changePercent: 4,
          exchange: "NASDAQ",
          volume: 50_000_000,
          sector: "Technology",
          industry: "Semiconductors",
          country: "US",
          beta: 1.7,
          marketCap: 3_000_000_000_000,
          dividendYield: 0.001,
        },
      ],
      warnings: [],
    });
    clearMarketDataCacheForTests();
    const service = createMarketDataService({ yahoo });
    const result = await service.getFmpMarketMovers({ kind: "gainers" });
    expect(result.data[0]?.sector).toBe("Technology");
    expect(result.data[0]?.marketCap).toBe(3_000_000_000_000);
    expect(result.data[0]?.volume).toBe(1);
  });

  it("returns screener results and caches repeated queries", async () => {
    const service = createMarketDataService({ yahoo });
    const query = { sector: "Technology", limit: 25 };
    const first = await service.getScreenerResults(query);
    const second = await service.getScreenerResults(query);
    expect(first.data[0]?.symbol).toBe("MSFT");
    expect(second.data[0]?.symbol).toBe("MSFT");
    expect(fmp.runStockScreener).toHaveBeenCalledTimes(1);
  });

  it("runs a two-step technical screener and exposes phase metadata", async () => {
    fmp.runStockScreener.mockResolvedValueOnce({
      rows: [
        {
          symbol: "PASS",
          name: "Pass Inc.",
          price: 10,
          change: -1,
          changePercent: -1,
          exchange: "NASDAQ",
          volume: 1_000_000,
          sector: "Technology",
          industry: "Software",
          country: "US",
          beta: 1,
          marketCap: 1_000_000_000,
          dividendYield: 0.01,
        },
        {
          symbol: "FAIL",
          name: "Fail Inc.",
          price: 10,
          change: 0,
          changePercent: 0,
          exchange: "NASDAQ",
          volume: 1_000_000,
          sector: "Technology",
          industry: "Software",
          country: "US",
          beta: 1,
          marketCap: 1_000_000_000,
          dividendYield: 0.01,
        },
      ],
      warnings: [],
    });

    const fallingCandles = Array.from({ length: 20 }, (_, index) => ({
      timestamp: 1_700_000_000 + index * 86_400_000,
      open: 100 - index,
      high: 100 - index,
      low: 100 - index,
      close: 100 - index,
    }));
    const flatCandles = Array.from({ length: 20 }, (_, index) => ({
      timestamp: 1_700_000_000 + index * 86_400_000,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
    }));

    yahoo.getChartCandles.mockImplementation(async (symbol: string) =>
      symbol === "PASS" ? fallingCandles : flatCandles,
    );

    const service = createMarketDataService({ yahoo });
    const query = {
      volume: { min: 500_000 },
      technical: { kind: "rsi" as const, period: 14, max: 30 },
      limit: 200,
    };
    const result = await service.getScreenerResults(query);

    expect(result.data.map((row) => row.symbol)).toEqual(["PASS"]);
    expect(
      result.phases?.some(
        (phase) =>
          phase.name === "screener.technical.aggregate" || phase.name === "screener.technical",
      ),
    ).toBe(true);
    expect(yahoo.getChartCandles).toHaveBeenCalledTimes(2);

    await service.getScreenerResults(query);
    expect(fmp.runStockScreener).toHaveBeenCalledTimes(1);
    expect(yahoo.getChartCandles).toHaveBeenCalledTimes(2);
  });
});
