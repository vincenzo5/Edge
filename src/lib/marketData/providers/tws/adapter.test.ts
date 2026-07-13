import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTwsProvider } from "./adapter";
import type { TwsClient } from "./client";

function createMockClient(): TwsClient {
  return {
    getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 5000 }),
    getHealth: vi.fn(async () => ({ ok: true })),
    getStatus: vi.fn(async () => ({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    })),
    resolveContract: vi.fn(async () => ({
      symbol: "AAPL",
      conid: 265598,
      exchange: "NASDAQ",
      companyName: "Apple Inc.",
    })),
    getCandles: vi.fn(async () => ({
      symbol: "AAPL",
      interval: "1d",
      candles: [{ t: 1_700_000_100_000, o: 2, h: 3, l: 1.5, c: 2.5, v: 100 }],
      hasMore: true,
    })),
    getQuotesBatch: vi.fn(async (symbols: string[]) => ({
      quotes: symbols.map((symbol) => ({
        symbol,
        price: 150,
        change: 1,
        changePercent: 0.5,
        volume: 1000,
        updatedAt: Date.now(),
      })),
      missingSymbols: [],
    })),
    getOptionExpirations: vi.fn(async () => ({
      expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
      warnings: [],
    })),
    getOptionsChain: vi.fn(async () => ({
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
            mark: 1.1,
            delta: 0.5,
            updatedAt: Date.now(),
          },
        ],
      },
      warnings: [],
    })),
  };
}

describe("createTwsProvider", () => {
  let client: TwsClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it("maps candles from sidecar response", async () => {
    const provider = createTwsProvider(client);
    const result = await provider.getCandles({
      symbol: "AAPL",
      interval: "1d",
      range: "1mo",
    });
    expect(result?.candles[0]?.c).toBe(2.5);
  });

  it("forwards sessionMode to TWS client", async () => {
    const provider = createTwsProvider(client);
    await provider.getCandles({
      symbol: "AAPL",
      interval: "5m",
      range: "1d",
      sessionMode: "extended",
    });
    expect(client.getCandles).toHaveBeenCalledWith(
      expect.objectContaining({ sessionMode: "extended" }),
    );
  });

  it("maps batch quotes", async () => {
    const provider = createTwsProvider(client);
    const batch = await provider.getQuotesBatch(["AAPL", "MSFT"]);
    expect(batch.quotes).toHaveLength(2);
    expect(batch.missingSymbols).toEqual([]);
  });

  it("forwards connectionId to TWS client for candles and quotes", async () => {
    const provider = createTwsProvider(client);
    await provider.getCandles(
      { symbol: "AAPL", interval: "1d", range: "1mo" },
      { connectionId: "ib-live" },
    );
    expect(client.getCandles).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: "ib-live" }),
    );

    await provider.getQuotesBatch(["AAPL"], { connectionId: "ib-live" });
    expect(client.getQuotesBatch).toHaveBeenCalledWith(
      ["AAPL"],
      expect.objectContaining({ connectionId: "ib-live" }),
    );
  });

  it("returns option expirations with warnings helper", async () => {
    const provider = createTwsProvider(client);
    const result = await provider.getOptionExpirationsWithWarnings("AAPL");
    expect(result?.expirations[0]?.expiration).toBe("2025-06-20");
  });

  it("returns options chain with greeks fields", async () => {
    const provider = createTwsProvider(client);
    const result = await provider.getOptionsChainWithWarnings({
      underlying: "AAPL",
      expiration: "2025-06-20",
    });
    expect(result?.chain.contracts[0]?.delta).toBe(0.5);
  });
});
