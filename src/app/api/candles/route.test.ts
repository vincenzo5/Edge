import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, clearCandleCacheForTests } from "./route";

const { getChartCandles, getChartCandlesBefore } = vi.hoisted(() => ({
  getChartCandles: vi.fn(async () => [
    { timestamp: 1, open: 10, high: 12, low: 9, close: 11 },
  ]),
  getChartCandlesBefore: vi.fn(async () => [
    { timestamp: 0, open: 9, high: 11, low: 8, close: 10 },
  ]),
}));

vi.mock("@/lib/marketData/service/server", async () => {
  const { createMarketDataService, clearMarketDataCacheForTests } =
    await import("@/lib/marketData/service/marketDataService");
  const service = createMarketDataService({
    yahoo: {
      searchSymbols: vi.fn(async () => []),
      getChartCandles,
      getChartCandlesBefore,
      getQuoteSnapshots: vi.fn(async () => []),
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
  return new Request("http://localhost/api/candles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/candles POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCandleCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns candles for valid symbol", async () => {
    const req = makeRequest({ symbol: "AAPL", range: "1y", interval: "1d" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.candles).toHaveLength(1);
    expect(json.meta).toMatchObject({ source: "yahoo", stale: false, warnings: [] });
  });

  it("rejects missing symbol with 400", async () => {
    const req = makeRequest({ range: "1y" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid range", async () => {
    const req = makeRequest({ symbol: "AAPL", range: "bad" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("caches identical range requests", async () => {
    const body = { symbol: "AAPL", range: "1y", interval: "1d" };
    await POST(makeRequest(body));
    await POST(makeRequest(body));
    expect(getChartCandles).toHaveBeenCalledTimes(1);
  });

  it("uses distinct cache keys for before requests", async () => {
    await POST(
      makeRequest({ symbol: "AAPL", interval: "1d", before: 1_700_000_000_000, barCount: 200 }),
    );
    await POST(
      makeRequest({ symbol: "AAPL", interval: "1d", before: 1_600_000_000_000, barCount: 200 }),
    );
    expect(getChartCandlesBefore).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed provider responses", async () => {
    getChartCandles
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValueOnce([{ timestamp: 2, open: 11, high: 13, low: 10, close: 12 }]);

    const body = { symbol: "AAPL", range: "1y", interval: "1d" };
    const first = await POST(makeRequest(body));
    expect(first.status).toBe(500);

    const second = await POST(makeRequest(body));
    expect(second.status).toBe(200);
    expect(getChartCandles).toHaveBeenCalledTimes(2);
  });

  it("expires cache entries after ttl", async () => {
    vi.useFakeTimers();
    const body = { symbol: "AAPL", range: "1y", interval: "1d" };
    await POST(makeRequest(body));
    await POST(makeRequest(body));
    expect(getChartCandles).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    await POST(makeRequest(body));
    expect(getChartCandles).toHaveBeenCalledTimes(2);
  });
});
