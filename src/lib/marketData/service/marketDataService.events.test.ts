import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMarketDataService,
  clearMarketDataCacheForTests,
} from "../service/marketDataService";

const fmpCorporateEvents = [
  {
    id: "fmp-earnings-AAPL-2026-01-30",
    type: "earnings" as const,
    symbol: "AAPL",
    title: "AAPL earnings",
    scheduledAt: "2026-01-30",
    source: "fmp",
  },
  {
    id: "fmp-dividend-AAPL-2026-02-15",
    type: "dividend" as const,
    symbol: "AAPL",
    title: "AAPL dividend",
    scheduledAt: "2026-02-15",
    source: "fmp",
  },
];

const fmp = {
  isConfigured: vi.fn(() => true),
  getCorporateEvents: vi.fn(async () => ({
    events: fmpCorporateEvents,
    warnings: [],
  })),
  getEconomicCalendar: vi.fn(async () => ({
    events: [
      {
        date: "2026-06-12 14:30:00",
        country: "US",
        event: "Consumer Price Index (CPI) YoY",
        currency: "USD",
        previous: 2.5,
        estimate: 2.7,
        actual: null,
        change: null,
        changePercentage: null,
        impact: "High",
      },
    ],
    warnings: [],
  })),
  getSecFilings: vi.fn(async () => ({
    filings: [
      {
        symbol: "AAPL",
        cik: "1",
        formType: "8-K",
        filingDate: "2026-01-15",
        acceptedDate: null,
        url: null,
      },
    ],
    warnings: [],
  })),
};

const sec = {
  isConfigured: vi.fn(() => true),
  getRecentFilings: vi.fn(async () => [
    {
      symbol: "AAPL",
      cik: "1",
      form: "8-K",
      filedAt: "2026-01-15",
      accessionNumber: "0001",
      url: "https://sec.gov/8k",
    },
  ]),
};

const fred = {
  isConfigured: vi.fn(() => true),
  getReleases: vi.fn(async () => [
    {
      releaseId: "10",
      name: "Consumer Price Index for All Urban Consumers",
      date: "2026-06-12",
      source: "fred",
    },
  ]),
};

vi.mock("../providers/fmp/adapter", () => ({
  createFmpProvider: () => fmp,
}));

vi.mock("../providers/sec/adapter", () => ({
  createSecProvider: () => sec,
}));

vi.mock("../providers/fred/adapter", () => ({
  createFredProvider: () => fred,
}));

vi.mock("../providers/tradier/adapter", () => ({
  createTradierOptionsProvider: () => ({ isConfigured: () => false }),
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

describe("MarketDataService market events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarketDataCacheForTests();
  });

  it("returns normalized corporate and filing events for a symbol", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getMarketEvents({ symbol: "AAPL" });
    const canonicalIds = result.data.map((event) => event.canonicalId);
    expect(canonicalIds).toContain("earnings");
    expect(canonicalIds).toContain("dividend");
    expect(canonicalIds).toContain("sec_8k");
    expect(result.data.every((event) => event.scheduledAt)).toBe(true);
  });

  it("dedupes SEC and FMP filing events for the same date", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getMarketEvents({ symbol: "AAPL" });
    const sec8k = result.data.filter((event) => event.canonicalId === "sec_8k");
    expect(sec8k).toHaveLength(1);
    expect(sec8k[0]?.source).toBe("sec");
  });

  it("includes full macro events from FMP when includeMacro is true", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getMarketEvents({
      includeMacro: true,
      families: ["macro"],
    });
    const cpi = result.data.find((event) => event.canonicalId === "cpi");
    expect(cpi).toBeDefined();
    expect(cpi?.source).toBe("fmp");
    expect(cpi?.coverageLevel).toBe("full");
    expect(result.warnings.some((w) => w.includes("partial via FRED fallback"))).toBe(false);
    expect(fmp.getEconomicCalendar).toHaveBeenCalled();
  });

  it("falls back to FRED when FMP calendar is restricted", async () => {
    fmp.getEconomicCalendar.mockResolvedValueOnce({
      events: [],
      warnings: ["FMP endpoint restricted (402): subscription required"],
    });
    const service = createMarketDataService({ yahoo });
    const result = await service.getMarketEvents({
      includeMacro: true,
      families: ["macro"],
    });
    expect(result.data.some((event) => event.canonicalId === "cpi")).toBe(true);
    expect(result.warnings.some((w) => w.includes("partial via FRED fallback"))).toBe(true);
  });

  it("maps getCorporateEvents to legacy corporate event shape", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getCorporateEvents({ symbol: "AAPL" });
    expect(result.data.some((event) => event.type === "earnings")).toBe(true);
    expect(result.data.some((event) => event.type === "filing")).toBe(true);
  });

  it("filters by canonical id", async () => {
    const service = createMarketDataService({ yahoo });
    const result = await service.getMarketEvents({
      symbol: "AAPL",
      canonicalIds: ["earnings"],
    });
    expect(result.data.every((event) => event.canonicalId === "earnings")).toBe(true);
  });

  it("passes default filing date window to FMP SEC filings when query dates are omitted", async () => {
    const service = createMarketDataService({ yahoo });
    await service.getMarketEvents({ symbol: "AAPL" });
    expect(fmp.getSecFilings).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        limit: 20,
      }),
    );
  });

  it("caches market event queries", async () => {
    const service = createMarketDataService({ yahoo });
    await service.getMarketEvents({ symbol: "AAPL" });
    await service.getMarketEvents({ symbol: "AAPL" });
    expect(fmp.getCorporateEvents).toHaveBeenCalledTimes(1);
    expect(sec.getRecentFilings).toHaveBeenCalledTimes(1);
  });
});
