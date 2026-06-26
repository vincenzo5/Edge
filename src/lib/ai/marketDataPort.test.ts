import { describe, it, expect, vi } from "vitest";
import { createServiceMarketDataPort } from "./marketDataPort";
import type { MarketDataService } from "@/lib/marketData/service/marketDataService";

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
  it("delegates search and fundamentals to MarketDataService", async () => {
    const service = makeService();
    const port = createServiceMarketDataPort(service);
    const results = await port.searchSymbols("AAPL");
    expect(results[0]?.symbol).toBe("AAPL");
    const fundamentals = await port.getFundamentals("AAPL");
    expect(fundamentals.symbol).toBe("AAPL");
  });
});
