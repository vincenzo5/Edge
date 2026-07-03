import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CandleResponse, EquityQuote } from "../contracts/equities";
import {
  createMarketDataService,
  clearMarketDataCacheForTests,
  resetTwsHealthGateForTests,
  resetIbkrHealthGateForTests,
  type MarketDataServiceDeps,
} from "../service/marketDataService";
import { twsHealthGate } from "../providers/tws/healthGate";
import { ibkrHealthGate } from "../providers/ibkr/healthGate";
import { TwsRequestError } from "../providers/tws/client";
import type { IbkrProvider } from "../providers/ibkr/adapter";
import type { TwsProvider } from "../providers/tws/adapter";
import type { MassiveProvider } from "../providers/massive/adapter";
import { globalHotStore, hotCandlesKey, hotQuoteKey, writeHotCandles, writeHotQuote } from "../hotStore";

const tradierGetExpirations = vi.fn(async () => [
  { underlying: "AAPL", expiration: "2025-07-18" },
]);
const tradierGetChain = vi.fn(async () => ({
  underlying: "AAPL",
  expiration: "2025-07-18",
  contracts: [
    {
      contractSymbol: "AAPL250718C00150000",
      underlying: "AAPL",
      type: "call" as const,
      expiration: "2025-07-18",
      strike: 150,
      bid: 2,
      ask: 2.1,
      updatedAt: Date.now(),
    },
  ],
}));

vi.mock("../providers/tradier/adapter", () => ({
  createTradierOptionsProvider: () => ({
    isConfigured: () => true,
    getExpirations: tradierGetExpirations,
    getChain: tradierGetChain,
  }),
}));

const ibkrCandles: CandleResponse = {
  symbol: "AAPL",
  interval: "1d",
  candles: [{ t: 1_700_000_100_000, o: 2, h: 3, l: 1.5, c: 2.5 }],
};

const ibkrQuotes: EquityQuote[] = [
  {
    symbol: "AAPL",
    price: 150,
    change: 2,
    changePercent: 1.5,
    volume: 2000,
    updatedAt: Date.now(),
  },
];

const yahoo = {
  searchSymbols: vi.fn(async () => [{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ" }]),
  getChartCandles: vi.fn(async () => [
    { timestamp: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
  ]),
  getChartCandlesBefore: vi.fn(async () => []),
  getQuoteSnapshots: vi.fn(async (symbols: string[]) =>
    symbols.map((symbol) => ({
      symbol,
      regularMarketPrice: 100,
      regularMarketChange: 1,
      regularMarketChangePercent: 1,
      regularMarketVolume: 1000,
      updatedAt: Date.now(),
    })),
  ),
  getFundamentalsSnapshot: vi.fn(async (symbol: string) => ({
    symbol,
    shortName: "Apple",
    longName: "Apple Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    regularMarketPrice: 100,
    regularMarketChange: 1,
    regularMarketChangePercent: 1,
    marketCap: 1,
    volume: 1,
    averageVolume: 1,
    sector: "Technology",
    industry: "Hardware",
    website: "apple.com",
    description: "desc",
    updatedAt: Date.now(),
  })),
};

function createMockIbkr(overrides: Partial<IbkrProvider> = {}): IbkrProvider {
  return {
    isConfigured: () => true,
    getStatusProbe: vi.fn(async () => ({
      configured: true,
      gatewayReachable: true,
      authenticated: true,
      connected: true,
      competing: false,
      warnings: [],
    })),
    resolveContract: vi.fn(async () => ({ symbol: "AAPL", conid: 265598 })),
    getQuote: vi.fn(async () => ibkrQuotes[0]!),
    getQuotes: vi.fn(async () => ibkrQuotes),
    getQuotesBatch: vi.fn(async (symbols: string[]) => ({
      quotes: ibkrQuotes.filter((q) => symbols.includes(q.symbol)),
      missingSymbols: symbols.filter((s) => !ibkrQuotes.some((q) => q.symbol === s)),
    })),
    getClient: vi.fn(() => null),
    getContractResolver: vi.fn(() => null),
    getCandles: vi.fn(async () => ibkrCandles),
    getCandlesForRange: vi.fn(async () => ibkrCandles),
    getOptionExpirations: vi.fn(async () => [
      { underlying: "AAPL", expiration: "2025-06-20" },
    ]),
    getOptionsChain: vi.fn(async () => ({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [
        {
          contractSymbol: "AAPL250620C00150000",
          underlying: "AAPL",
          type: "call" as const,
          expiration: "2025-06-20",
          strike: 150,
          bid: 1,
          ask: 1.2,
          updatedAt: Date.now(),
        },
      ],
    })),
    getOptionExpirationsWithWarnings: vi.fn(async () => ({
      expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
      warnings: [],
    })),
    getOptionsChainWithWarnings: vi.fn(async () => ({
      chain: {
        underlying: "AAPL",
        expiration: "2025-06-20",
        contracts: [
          {
            contractSymbol: "AAPL250620C00150000",
            underlying: "AAPL",
            type: "call" as const,
            expiration: "2025-06-20",
            strike: 150,
            bid: 1,
            ask: 1.2,
            updatedAt: Date.now(),
          },
        ],
      },
      warnings: [],
    })),
    ...overrides,
  };
}

function createMockTws(overrides: Partial<TwsProvider> = {}): TwsProvider {
  return {
    isConfigured: () => true,
    probeLiveness: vi.fn(async () => true),
    probeStatus: vi.fn(async () => ({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    })),
    getStatusProbe: vi.fn(async () => ({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    })),
    resolveContract: vi.fn(async () => ({ symbol: "AAPL", conid: 265598 })),
    warmup: vi.fn(async () => {}),
    getQuote: vi.fn(async () => ({ ...ibkrQuotes[0]!, symbol: "AAPL" })),
    getQuotes: vi.fn(async () => ibkrQuotes),
    getQuotesBatch: vi.fn(async (symbols: string[]) => ({
      quotes: ibkrQuotes.filter((q) => symbols.includes(q.symbol)),
      missingSymbols: symbols.filter((s) => !ibkrQuotes.some((q) => q.symbol === s)),
    })),
    getClient: vi.fn(() => ({ getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 5000 }) })),
    getCandles: vi.fn(async () => ({ ...ibkrCandles, symbol: "AAPL" })),
    getCandlesForRange: vi.fn(async () => ibkrCandles),
    getOptionExpirations: vi.fn(async () => [{ underlying: "AAPL", expiration: "2025-06-20" }]),
    getOptionsChain: vi.fn(async () => ({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [
        {
          contractSymbol: "AAPL250620C00150000",
          underlying: "AAPL",
          type: "call" as const,
          expiration: "2025-06-20",
          strike: 150,
          bid: 1,
          ask: 1.2,
          updatedAt: Date.now(),
        },
      ],
    })),
    getOptionExpirationsWithWarnings: vi.fn(async () => ({
      expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
      warnings: [],
    })),
    getOptionsChainWithWarnings: vi.fn(async () => ({
      chain: {
        underlying: "AAPL",
        expiration: "2025-06-20",
        contracts: [
          {
            contractSymbol: "AAPL250620C00150000",
            underlying: "AAPL",
            type: "call" as const,
            expiration: "2025-06-20",
            strike: 150,
            bid: 1,
            ask: 1.2,
            updatedAt: Date.now(),
          },
        ],
      },
      warnings: [],
    })),
    ...overrides,
  };
}

function createUnconfiguredTws(): TwsProvider {
  return createMockTws({ isConfigured: () => false });
}

function createUnconfiguredIbkr(): IbkrProvider {
  return createMockIbkr({ isConfigured: () => false });
}

function createMockMassive(overrides: Partial<MassiveProvider> = {}): MassiveProvider {
  return {
    isConfigured: () => true,
    getDailyMarketSummary: vi.fn(async () => ({ bySymbol: new Map(), warnings: [] })),
    getAggregates: vi.fn(async () => ({ candles: [], warnings: [] })),
    getSnapshotAllTickers: vi.fn(async () => ({ rows: [], warnings: [] })),
    tradingDateToUtcMs: vi.fn(() => 0),
    getOptionExpirationsWithWarnings: vi.fn(async () => ({
      expirations: [{ underlying: "AAPL", expiration: "2025-07-18" }],
      warnings: [],
    })),
    getOptionsChainWithWarnings: vi.fn(async () => ({
      chain: {
        underlying: "AAPL",
        expiration: "2025-07-18",
        contracts: [
          {
            contractSymbol: "AAPL250718C00150000",
            underlying: "AAPL",
            type: "call" as const,
            expiration: "2025-07-18",
            strike: 150,
            bid: 2,
            ask: 2.1,
            updatedAt: Date.now(),
          },
        ],
      },
      warnings: [],
    })),
    ...overrides,
  } as MassiveProvider;
}

function createUnconfiguredMassive(): MassiveProvider {
  return createMockMassive({ isConfigured: () => false });
}

function createService(overrides: Partial<MarketDataServiceDeps> = {}) {
  return createMarketDataService({
    yahoo,
    tws: createUnconfiguredTws(),
    ibkr: createUnconfiguredIbkr(),
    massive: createUnconfiguredMassive(),
    ...overrides,
  });
}

describe("MarketDataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarketDataCacheForTests();
    resetTwsHealthGateForTests();
    resetIbkrHealthGateForTests();
  });

  it("returns instrument search results with metadata", async () => {
    const service = createService();
    const result = await service.searchInstruments("AAPL");
    expect(result.data[0]?.symbol).toBe("AAPL");
    expect(result.source).toBe("yahoo");
  });

  it("caches quote requests", async () => {
    const service = createService();
    await service.getQuotes(["AAPL"]);
    await service.getQuotes(["AAPL"]);
    expect(yahoo.getQuoteSnapshots).toHaveBeenCalledTimes(1);
  });

  it("maps legacy candles to yahoo seconds shape", async () => {
    const service = createService();
    const result = await service.getLegacyCandles({
      symbol: "AAPL",
      range: "1y",
      interval: "1d",
    });
    expect(result.data[0]?.timestamp).toBe(1_700_000_000);
  });

  it("computes rvol derived metric when volume data exists", async () => {
    const service = createService();
    const result = await service.getDerivedMetric("AAPL", "rvol");
    expect(result.data?.kind).toBe("rvol");
    expect(result.data?.value).toBe(1000);
  });

  describe("TWS-first candle routing", () => {
    it("returns TWS candles before IBKR when both configured", async () => {
      const tws = createMockTws({
        getCandles: vi.fn(async () => ({
          ...ibkrCandles,
          candles: [{ t: 2, o: 10, h: 11, l: 9, c: 10.5 }],
        })),
      });
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("tws");
      expect(result.data.candles[0]?.c).toBe(10.5);
      expect(ibkr.getCandles).not.toHaveBeenCalled();
    });

    it("falls back to IBKR then Yahoo when TWS returns empty", async () => {
      const tws = createMockTws({
        getCandles: vi.fn(async () => ({ ...ibkrCandles, candles: [] })),
      });
      const ibkr = createMockIbkr({
        getCandles: vi.fn(async () => null),
      });
      const service = createService({ ibkr, tws });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("yahoo");
      expect(result.warnings.some((w) => w.includes("TWS"))).toBe(true);
    });
  });

  describe("TWS-first quote routing", () => {
    it("returns TWS quotes when configured", async () => {
      const tws = createMockTws();
      const service = createService({ ibkr: createMockIbkr(), tws });
      const result = await service.getQuotes(["AAPL"]);
      expect(result.source).toBe("tws");
    });
  });

  describe("Massive-first options routing", () => {
    it("returns Massive option expirations without calling TWS or IBKR", async () => {
      const massive = createMockMassive();
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ massive, tws, ibkr });
      const result = await service.getOptionExpirations("AAPL");
      expect(result.source).toBe("massive");
      expect(result.data[0]?.expiration).toBe("2025-07-18");
      expect(tws.getOptionExpirationsWithWarnings).not.toHaveBeenCalled();
      expect(ibkr.getOptionExpirationsWithWarnings).not.toHaveBeenCalled();
    });

    it("returns Massive options chain without calling TWS or IBKR", async () => {
      const massive = createMockMassive();
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ massive, tws, ibkr });
      const result = await service.getOptionsChain({
        underlying: "AAPL",
        expiration: "2025-07-18",
      });
      expect(result.source).toBe("massive");
      expect(result.data.contracts[0]?.strike).toBe(150);
      expect(tws.getOptionsChainWithWarnings).not.toHaveBeenCalled();
      expect(ibkr.getOptionsChainWithWarnings).not.toHaveBeenCalled();
    });

    it("warms up options expirations via Massive when broker gates are open", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      ibkrHealthGate.recordFailure("gateway_unreachable");
      const massive = createMockMassive();
      const service = createService({
        massive,
        tws: createMockTws(),
        ibkr: createMockIbkr(),
      });
      const report = await service.primeMarketData({ optionsSymbol: "AAPL" });
      const optionsPhase = report.phases.find((phase) => phase.name === "options.expirations");
      expect(optionsPhase?.ok).toBe(true);
      expect(optionsPhase?.source).toBe("massive");
    });
  });

  describe("TWS-first options routing", () => {
    it("returns TWS option expirations before IBKR", async () => {
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getOptionExpirations("AAPL");
      expect(result.source).toBe("tws");
      expect(ibkr.getOptionExpirationsWithWarnings).not.toHaveBeenCalled();
    });

    it("falls back to IBKR when TWS returns no expirations", async () => {
      const tws = createMockTws({
        getOptionExpirationsWithWarnings: vi.fn(async () => ({
          expirations: [],
          warnings: ["TWS returned no option expirations"],
        })),
      });
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getOptionExpirations("AAPL");
      expect(result.source).toBe("ibkr");
      expect(result.warnings.some((w) => w.includes("TWS"))).toBe(true);
    });

    it("skips TWS when circuit is open and falls back to IBKR", async () => {
      twsHealthGate.recordFailure("request_timeout");
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getOptionExpirations("AAPL");
      expect(result.source).toBe("ibkr");
      expect(tws.getOptionExpirationsWithWarnings).not.toHaveBeenCalled();
      expect(result.warnings.some((w) => w.includes("TWS temporarily skipped"))).toBe(true);
    });
  });

  describe("TWS health gate candle routing", () => {
    it("skips TWS and falls back quickly when circuit is open", async () => {
      twsHealthGate.recordFailure("gateway_disconnected");
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("ibkr");
      expect(tws.probeLiveness).not.toHaveBeenCalled();
      expect(tws.getCandles).not.toHaveBeenCalled();
      expect(result.warnings.some((w) => w.includes("TWS temporarily skipped"))).toBe(true);
    });

    it("opens circuit after TWS timeout and skips subsequent candle attempts", async () => {
      const tws = createMockTws({
        getCandles: vi.fn(async () => {
          throw new TwsRequestError("request_timeout", "candles request timed out");
        }),
      });
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });

      const first = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(first.source).toBe("ibkr");
      expect(tws.getCandles).toHaveBeenCalledTimes(1);

      const second = await service.getCandles({
        symbol: "MSFT",
        range: "1mo",
        interval: "1d",
      });
      expect(second.source).toBe("ibkr");
      expect(tws.getCandles).toHaveBeenCalledTimes(1);
      expect(second.warnings.some((w) => w.includes("TWS temporarily skipped"))).toBe(true);
    });
  });

  describe("TWS recovery state reset", () => {
    it("clears TWS circuit and stale hot Yahoo entries so TWS is retried", async () => {
      twsHealthGate.recordFailure("gateway_disconnected");
      const candleRequest = { symbol: "AAPL", range: "1mo" as const, interval: "1d" as const };
      writeHotQuote(
        { symbol: "AAPL", price: 100, change: 1, changePercent: 1, volume: 1000, updatedAt: Date.now() },
        "yahoo",
      );
      writeHotCandles(
        candleRequest,
        { symbol: "AAPL", interval: "1d", candles: [{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5 }] },
        "yahoo",
      );

      const tws = createMockTws();
      const service = createService({ ibkr: createMockIbkr(), tws });

      const beforeReset = await service.getCandles(candleRequest);
      expect(beforeReset.source).toBe("ibkr");
      expect(tws.getCandles).not.toHaveBeenCalled();

      service.resetTwsRecoveryState({
        symbols: ["AAPL"],
        candleRequests: [candleRequest],
      });
      expect(globalHotStore.read(hotQuoteKey("AAPL")).hit).toBe(false);
      expect(globalHotStore.read(hotCandlesKey(candleRequest)).hit).toBe(false);

      const afterReset = await service.getCandles(candleRequest);
      expect(afterReset.source).toBe("tws");
      expect(tws.getCandles).toHaveBeenCalledOnce();
    });
  });

  describe("IBKR-first candle routing", () => {
    it("returns IBKR candles when configured and data is available", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("ibkr");
      expect(result.data.candles[0]?.c).toBe(2.5);
      expect(yahoo.getChartCandles).not.toHaveBeenCalled();
    });

    it("falls back to Yahoo when IBKR returns empty candles", async () => {
      const ibkr = createMockIbkr({
        getCandles: vi.fn(async () => ({ ...ibkrCandles, candles: [] })),
      });
      const service = createService({ ibkr });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("yahoo");
      expect(result.warnings.some((w) => w.includes("IBKR"))).toBe(true);
      expect(yahoo.getChartCandles).toHaveBeenCalled();
    });

    it("falls back to Yahoo when IBKR throws", async () => {
      const ibkr = createMockIbkr({
        getCandles: vi.fn(async () => {
          throw new Error("not authenticated");
        }),
      });
      const service = createService({ ibkr });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("yahoo");
      expect(result.warnings.some((w) => w.includes("not authenticated"))).toBe(true);
    });

    it("falls back to Yahoo when IBKR returns null", async () => {
      const ibkr = createMockIbkr({
        getCandles: vi.fn(async () => null),
      });
      const service = createService({ ibkr });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });
      expect(result.source).toBe("yahoo");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("uses separate cache keys so Yahoo fallback does not mask later IBKR success", async () => {
      const ibkr = createMockIbkr({
        getCandles: vi.fn(async () => null),
      });
      const service = createService({ ibkr });
      await service.getCandles({ symbol: "AAPL", range: "1mo", interval: "1d" });
      expect(yahoo.getChartCandles).toHaveBeenCalledTimes(1);

      vi.mocked(ibkr.getCandles).mockResolvedValue(ibkrCandles);
      const second = await service.getCandles({ symbol: "AAPL", range: "1mo", interval: "1d" });
      expect(second.source).toBe("ibkr");
      expect(yahoo.getChartCandles).toHaveBeenCalledTimes(1);
    });
  });

  describe("IBKR-first quote routing", () => {
    it("returns IBKR quotes when configured and all symbols resolve", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const result = await service.getQuotes(["AAPL"]);
      expect(result.source).toBe("ibkr");
      expect(result.data[0]?.price).toBe(150);
      expect(yahoo.getQuoteSnapshots).not.toHaveBeenCalled();
    });

    it("falls back to Yahoo when IBKR returns null", async () => {
      const ibkr = createMockIbkr({
        getQuotesBatch: vi.fn(async () => ({ quotes: [], missingSymbols: ["AAPL"] })),
      });
      const service = createService({ ibkr });
      const result = await service.getQuotes(["AAPL"]);
      expect(result.source).toBe("mixed");
      expect(result.warnings.some((w) => w.includes("IBKR"))).toBe(true);
    });

    it("falls back to Yahoo when IBKR throws", async () => {
      const ibkr = createMockIbkr({
        getQuotesBatch: vi.fn(async () => {
          throw new Error("gateway unreachable");
        }),
      });
      const service = createService({ ibkr });
      const result = await service.getQuotes(["AAPL"]);
      expect(result.source).toBe("yahoo");
      expect(result.warnings.some((w) => w.includes("gateway unreachable"))).toBe(true);
    });

    it("preserves watchlist quote mapping from routed source", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const result = await service.getWatchlistQuotes(["AAPL"]);
      expect(result.source).toBe("ibkr");
      expect(result.data[0]?.symbol).toBe("AAPL");
    });
  });

  describe("IBKR-first options routing", () => {
    it("returns IBKR option expirations when configured", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const result = await service.getOptionExpirations("AAPL");
      expect(result.source).toBe("ibkr");
      expect(result.data[0]?.expiration).toBe("2025-06-20");
      expect(tradierGetExpirations).not.toHaveBeenCalled();
    });

    it("throws when IBKR returns no expirations (no fallback)", async () => {
      const ibkr = createMockIbkr({
        getOptionExpirationsWithWarnings: vi.fn(async () => ({
          expirations: [],
          warnings: ["IBKR returned no option expirations"],
        })),
      });
      const service = createService({ ibkr });
      await expect(service.getOptionExpirations("AAPL")).rejects.toThrow(
        /IBKR returned no option expirations/i,
      );
      expect(tradierGetExpirations).not.toHaveBeenCalled();
    });

    it("returns IBKR options chain when configured", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const result = await service.getOptionsChain({
        underlying: "AAPL",
        expiration: "2025-06-20",
      });
      expect(result.source).toBe("ibkr");
      expect(result.data.contracts[0]?.strike).toBe(150);
      expect(tradierGetChain).not.toHaveBeenCalled();
    });

    it("throws when IBKR chain is empty (no fallback)", async () => {
      const ibkr = createMockIbkr({
        getOptionsChainWithWarnings: vi.fn(async () => ({
          chain: { underlying: "AAPL", expiration: "2025-07-18", contracts: [] },
          warnings: ["IBKR returned no contracts"],
        })),
      });
      const service = createService({ ibkr });
      await expect(
        service.getOptionsChain({ underlying: "AAPL", expiration: "2025-07-18" }),
      ).rejects.toThrow(/IBKR returned no contracts/i);
      expect(tradierGetChain).not.toHaveBeenCalled();
    });

    it("uses IBKR cache without invoking Tradier", async () => {
      const ibkr = createMockIbkr({
        getOptionsChainWithWarnings: vi.fn(async () => ({
          chain: { underlying: "AAPL", expiration: "2025-06-20", contracts: [] },
          warnings: [],
        })),
      });
      const service = createService({ ibkr });
      await expect(
        service.getOptionsChain({ underlying: "AAPL", expiration: "2025-06-20" }),
      ).rejects.toThrow();
      expect(tradierGetChain).not.toHaveBeenCalled();
    });
  });

  describe("Hot store stale-while-revalidate", () => {
    it("serves repeat candle reads from hot store without refetching provider", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const request = { symbol: "AAPL", interval: "1d" as const, range: "1mo" as const };
      await service.getCandles(request);
      await service.getCandles(request);
      expect(ibkr.getCandles).toHaveBeenCalledTimes(1);
    });

    it("returns stale candle snapshot and schedules background revalidation", async () => {
      const ibkr = createMockIbkr();
      const service = createService({ ibkr });
      const request = { symbol: "AAPL", interval: "1d" as const, range: "1mo" as const };
      await service.getCandles(request);
      globalHotStore.write(hotCandlesKey(request), ibkrCandles, {
        source: "ibkr",
        freshMs: 0,
        staleMs: 60_000,
      });
      const stale = await service.getCandles(request);
      expect(stale.stale).toBe(true);
      await vi.waitFor(() => {
        expect(ibkr.getCandles).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("primeMarketData", () => {
    it("preloads option expirations without fetching the options chain", async () => {
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const report = await service.primeMarketData({
        symbols: ["AAPL"],
        candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
        optionsSymbol: "AAPL",
      });

      expect(report.phases.some((phase) => phase.name === "options.expirations")).toBe(true);
      expect(report.phases.some((phase) => phase.name === "options.chain")).toBe(false);
      expect(tws.getOptionExpirationsWithWarnings).toHaveBeenCalled();
      expect(tws.getOptionsChainWithWarnings).not.toHaveBeenCalled();
      expect(ibkr.getOptionsChainWithWarnings).not.toHaveBeenCalled();
    });
  });

  describe("IBKR auth health gate quote routing", () => {
    it("skips IBKR and fills via Yahoo when auth circuit is open", async () => {
      ibkrHealthGate.recordFailure("auth_failure");
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws: createUnconfiguredTws() });
      const result = await service.getQuotes(["AAPL"]);

      expect(result.source).toBe("yahoo");
      expect(ibkr.getQuotesBatch).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("IBKR temporarily skipped"))).toBe(
        true,
      );
    });

    it("skips IBKR on first quote attempt when status probe reports unauthenticated", async () => {
      const ibkr = createMockIbkr({
        getStatusProbe: vi.fn(async () => ({
          configured: true,
          gatewayReachable: true,
          authenticated: false,
          connected: false,
          competing: false,
          warnings: [],
        })),
      });
      const service = createService({ ibkr, tws: createUnconfiguredTws() });
      const result = await service.getQuotes(["AAPL"]);

      expect(result.source).toBe("yahoo");
      expect(ibkr.getQuotesBatch).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("IBKR temporarily skipped"))).toBe(
        true,
      );
    });
  });

  describe("partial hot quote routing", () => {
    it("serves hot quotes immediately and fetches only missing symbols", async () => {
      writeHotQuote(
        { ...ibkrQuotes[0]!, symbol: "AAPL" },
        "tws",
        [],
      );
      const tws = createMockTws({
        getQuotesBatch: vi.fn(async (symbols: string[]) => ({
          quotes: [{ ...ibkrQuotes[0]!, symbol: "MSFT", price: 420 }],
          missingSymbols: symbols.filter((symbol) => symbol !== "MSFT"),
        })),
      });
      const service = createService({ ibkr: createMockIbkr(), tws });
      const result = await service.getQuotes(["AAPL", "MSFT"]);

      expect(result.data).toHaveLength(2);
      expect(result.data.find((quote) => quote.symbol === "AAPL")?.price).toBe(150);
      expect(result.data.find((quote) => quote.symbol === "MSFT")?.price).toBe(420);
      expect(tws.getQuotesBatch).toHaveBeenCalledWith(["MSFT"]);
    });
  });

  describe("TWS gateway status probe routing", () => {
    it("skips TWS candle attempts when status probe reports Gateway disconnected", async () => {
      const tws = createMockTws({
        probeStatus: vi.fn(async () => ({
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          warnings: ["Not connected"],
        })),
      });
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getCandles({
        symbol: "AAPL",
        range: "1mo",
        interval: "1d",
      });

      expect(result.source).toBe("ibkr");
      expect(tws.getCandles).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("TWS temporarily skipped"))).toBe(
        true,
      );
    });

    it("skips TWS quote attempts when status probe reports Gateway disconnected", async () => {
      const tws = createMockTws({
        probeStatus: vi.fn(async () => ({
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          warnings: ["Not connected"],
        })),
      });
      const ibkr = createMockIbkr();
      const service = createService({ ibkr, tws });
      const result = await service.getQuotes(["AAPL"]);

      expect(tws.getQuotesBatch).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("TWS temporarily skipped"))).toBe(
        true,
      );
    });
  });

  describe("TWS status probe", () => {
    it("fast-fails when sidecar status probe returns null", async () => {
      const tws = createMockTws({
        probeStatus: vi.fn(async () => null),
        getStatusProbe: vi.fn(async () => ({
          configured: true,
          sidecarReachable: true,
          gatewayConnected: true,
          warnings: [],
        })),
      });
      const service = createService({ tws, ibkr: createMockIbkr() });
      const result = await service.getTwsStatusProbe();

      expect(result.data.sidecarReachable).toBe(false);
      expect(tws.probeStatus).toHaveBeenCalledOnce();
      expect(tws.getStatusProbe).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("Sidecar unreachable"))).toBe(true);
    });

    it("uses a single short status probe when sidecar answers", async () => {
      const tws = createMockTws();
      const service = createService({ tws, ibkr: createMockIbkr() });
      const result = await service.getTwsStatusProbe();

      expect(result.data.gatewayConnected).toBe(true);
      expect(tws.probeStatus).toHaveBeenCalledOnce();
      expect(tws.getStatusProbe).not.toHaveBeenCalled();
    });

    it("skips sidecar network I/O while the TWS circuit is open", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      const tws = createMockTws();
      const service = createService({ tws, ibkr: createMockIbkr() });
      const result = await service.getTwsStatusProbe();

      expect(result.data.sidecarReachable).toBe(false);
      expect(tws.probeStatus).not.toHaveBeenCalled();
      expect(result.warnings.some((warning) => warning.includes("TWS temporarily skipped"))).toBe(
        true,
      );
    });

    it("bypasses the circuit when recovery requests fresh sidecar status", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      const tws = createMockTws();
      const service = createService({ tws, ibkr: createMockIbkr() });
      const result = await service.getTwsStatusProbe({ bypassCircuit: true });

      expect(result.data.gatewayConnected).toBe(true);
      expect(tws.probeStatus).toHaveBeenCalledOnce();
    });
  });

  describe("quote stream transport", () => {
    it("skips TWS stream when circuit is open", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      const tws = createMockTws();
      const service = createService({ tws, ibkr: createMockIbkr() });
      await expect(service.resolveQuoteStreamTransport()).resolves.toBe("ibkr");
      expect(tws.probeStatus).not.toHaveBeenCalled();
    });

    it("skips TWS stream when sidecar worker is wedged", async () => {
      const tws = createMockTws({
        probeStatus: vi.fn(async () => ({
          configured: true,
          sidecarReachable: true,
          gatewayConnected: true,
          restartRequired: true,
          diagnostics: { workerWedged: true },
          warnings: [],
        })),
      });
      const service = createService({ tws, ibkr: createMockIbkr() });
      await expect(service.resolveQuoteStreamTransport()).resolves.toBe("ibkr");
    });
  });

  describe("primeMarketData warmup bounds", () => {
    it("skips TWS warmup when circuit is open", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      const tws = createMockTws({
        warmup: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60_000));
        }),
      });
      const service = createService({ tws, ibkr: createMockIbkr() });
      const report = await service.primeMarketData({ symbols: ["AAPL"] });
      const warmupPhase = report.phases.find((phase) => phase.name === "tws.warmup");
      expect(warmupPhase?.ok).toBe(false);
      expect(tws.warmup).not.toHaveBeenCalled();
    });

    it("records timeout when TWS warmup hangs", async () => {
      vi.useFakeTimers();
      const tws = createMockTws({
        warmup: vi.fn(
          () =>
            new Promise<void>(() => {
              /* never resolves */
            }),
        ),
      });
      const service = createService({ tws, ibkr: createMockIbkr() });
      const reportPromise = service.primeMarketData({ symbols: ["AAPL"] });
      await vi.advanceTimersByTimeAsync(6_000);
      const report = await reportPromise;
      const warmupPhase = report.phases.find((phase) => phase.name === "tws.warmup");
      expect(warmupPhase?.ok).toBe(false);
      expect(warmupPhase?.error).toMatch(/timed out/i);
      vi.useRealTimers();
    });

    it("defers options warmup when TWS and IBKR gates are open", async () => {
      twsHealthGate.recordFailure("sidecar_unreachable");
      ibkrHealthGate.recordFailure("gateway_unreachable");
      const tws = createMockTws();
      const ibkr = createMockIbkr();
      const service = createService({ tws, ibkr });
      const report = await service.primeMarketData({ optionsSymbol: "AAPL" });
      const optionsPhase = report.phases.find((phase) => phase.name === "options.expirations");
      expect(optionsPhase?.ok).toBe(false);
      expect(optionsPhase?.error).toMatch(/deferred/i);
    });
  });
});
