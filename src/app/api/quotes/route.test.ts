import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, clearQuoteCacheForTests } from "./route";

const { getQuoteSnapshots } = vi.hoisted(() => ({
  getQuoteSnapshots: vi.fn(async () => [
    {
      symbol: "AAPL",
      regularMarketPrice: 150,
      regularMarketChange: 1,
      regularMarketChangePercent: 0.5,
      regularMarketVolume: 1000,
      updatedAt: Date.now(),
    },
  ]),
}));

vi.mock("@/lib/marketData/service/server", async () => {
  const { createMarketDataService, clearMarketDataCacheForTests } =
    await import("@/lib/marketData/service/marketDataService");
  const service = createMarketDataService({
    yahoo: {
      searchSymbols: vi.fn(async () => []),
      getChartCandles: vi.fn(async () => []),
      getChartCandlesBefore: vi.fn(async () => []),
      getQuoteSnapshots,
      getFundamentalsSnapshot: vi.fn(async () => ({
        symbol: "AAPL",
        shortName: null,
        longName: null,
        exchange: null,
        currency: null,
        regularMarketPrice: null,
        regularMarketChange: null,
        regularMarketChangePercent: null,
        marketCap: null,
        volume: null,
        averageVolume: null,
        sector: null,
        industry: null,
        website: null,
        description: null,
        updatedAt: Date.now(),
      })),
    },
  });
  return {
    getServerMarketDataService: () => service,
    clearMarketDataCacheForTests,
  };
});

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/quotes POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearQuoteCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns quotes for valid symbols", async () => {
    const res = await POST(makeRequest({ symbols: ["AAPL"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quotes).toHaveLength(1);
    expect(json.quotes[0].symbol).toBe("AAPL");
    expect(json.meta).toMatchObject({
      source: "yahoo",
      stale: false,
      warnings: [],
      usage: "display",
      readiness: {
        status: "ok",
        allowedForTradingDecision: false,
      },
    });
  });

  it("rejects missing symbols with 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects empty symbols array with 400", async () => {
    const res = await POST(makeRequest({ symbols: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const req = new Request("http://localhost/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("caches identical requests", async () => {
    const body = { symbols: ["AAPL"] };
    await POST(makeRequest(body));
    await POST(makeRequest(body));
    expect(getQuoteSnapshots).toHaveBeenCalledTimes(1);
  });

  it("does not cache provider errors", async () => {
    getQuoteSnapshots
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce([
        {
          symbol: "AAPL",
          regularMarketPrice: 151,
          regularMarketChange: 2,
          regularMarketChangePercent: 1,
          regularMarketVolume: 2000,
          updatedAt: Date.now(),
        },
      ]);

    const body = { symbols: ["AAPL"] };
    const first = await POST(makeRequest(body));
    expect(first.status).toBe(500);

    const second = await POST(makeRequest(body));
    expect(second.status).toBe(200);
    expect(getQuoteSnapshots).toHaveBeenCalledTimes(2);
  });

  it("expires cache after ttl", async () => {
    vi.useFakeTimers();
    const body = { symbols: ["AAPL"] };
    await POST(makeRequest(body));
    await POST(makeRequest(body));
    expect(getQuoteSnapshots).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(31_000);
    await POST(makeRequest(body));
    expect(getQuoteSnapshots).toHaveBeenCalledTimes(2);
  });
});
