import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createFetchMarketDataPort, createServiceMarketDataPort } from "./marketDataPort";
import type { MarketDataService } from "@/lib/marketData/service/marketDataService";
import {
  clearSharedClientTtlCacheForTests,
} from "@/lib/marketData/cache/clientTtlCache";
import { resetClientTtlFetchCoalesceForTests } from "@/lib/marketData/cache/getOrFetchClientTtl";

function makeService(): MarketDataService {
  return {
    searchInstruments: vi.fn(async () => ({
      data: [{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ", assetType: "equity" }],
      source: "yahoo",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    })),
    getLegacyCandles: vi.fn(async () => ({
      data: [{ timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5 }],
      source: "yahoo",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    })),
    getWatchlistQuotes: vi.fn(async () => ({
      data: [
        {
          symbol: "AAPL",
          regularMarketPrice: 100,
          regularMarketChange: 1,
          regularMarketChangePercent: 1,
          regularMarketVolume: 1000,
          updatedAt: Date.now(),
        },
      ],
      source: "yahoo",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    })),
    getWatchlistFundamentals: vi.fn(async () => ({
      data: {
        symbol: "AAPL",
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
      },
      source: "yahoo",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    })),
  } as unknown as MarketDataService;
}

describe("createServiceMarketDataPort", () => {
  it("delegates search and fundamentals to MarketDataService with trust meta", async () => {
    const service = makeService();
    const port = createServiceMarketDataPort(service);
    const results = await port.searchSymbols("AAPL");
    expect(results.data[0]?.symbol).toBe("AAPL");
    expect(results.meta.source).toBe("yahoo");
    const fundamentals = await port.getFundamentals("AAPL");
    expect(fundamentals.data.symbol).toBe("AAPL");
    expect(fundamentals.meta.readiness.allowedForTradingDecision).toBe(false);
  });
});

describe("createFetchMarketDataPort", () => {
  beforeEach(() => {
    clearSharedClientTtlCacheForTests();
    resetClientTtlFetchCoalesceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/search")) {
          return new Response(JSON.stringify({ results: [{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ" }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/api/quotes")) {
          return new Response(
            JSON.stringify({
              quotes: [
                {
                  symbol: "AAPL",
                  regularMarketPrice: 100,
                  regularMarketChange: 1,
                  regularMarketChangePercent: 1,
                  regularMarketVolume: 1000,
                  updatedAt: Date.now(),
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.endsWith("/api/candles")) {
          return new Response(
            JSON.stringify({ candles: [{ timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5 }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSharedClientTtlCacheForTests();
    resetClientTtlFetchCoalesceForTests();
  });

  it("memoizes searchSymbols within TTL", async () => {
    const port = createFetchMarketDataPort("");
    await port.searchSymbols("AAPL");
    await port.searchSymbols("AAPL");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("memoizes getQuotes within TTL", async () => {
    const port = createFetchMarketDataPort("");
    await port.getQuotes(["AAPL"]);
    await port.getQuotes(["AAPL"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("memoizes getCandles within TTL", async () => {
    const port = createFetchMarketDataPort("");
    await port.getCandles({ symbol: "AAPL", range: "1mo", interval: "1d" });
    await port.getCandles({ symbol: "AAPL", range: "1mo", interval: "1d" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
