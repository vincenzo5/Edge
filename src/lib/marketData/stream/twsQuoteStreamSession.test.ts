import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createTwsQuoteStreamSession } from "./twsQuoteStreamSession";
import type { MarketDataService } from "../service/marketDataService";

describe("createTwsQuoteStreamSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("falls back to REST poll when sidecar connect times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const getQuotes = vi.fn(async () => ({
      data: [
        {
          symbol: "AAPL",
          price: 100,
          change: 1,
          changePercent: 1,
          volume: 1000,
          updatedAt: Date.now(),
        },
      ],
      source: "yahoo" as const,
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    }));

    const service = {
      getTwsProvider: () => ({
        getClient: () => ({
          getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 5000 }),
        }),
      }),
      getQuotes,
      getWatchlistQuotes: vi.fn(),
    } as unknown as MarketDataService;

    const events: string[] = [];
    const session = createTwsQuoteStreamSession(service, { symbols: ["AAPL"] });
    session.start((payload) => events.push(payload));

    await vi.advanceTimersByTimeAsync(3_500);

    expect(getQuotes).toHaveBeenCalled();
    const parsed = events.map((payload) => JSON.parse(payload) as { type: string });
    expect(parsed.some((event) => event.type === "snapshot")).toBe(true);
    session.stop();
  });

  it("falls back to REST poll when fetch fails immediately", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, body: null })));

    const getQuotes = vi.fn(async () => ({
      data: [
        {
          symbol: "MSFT",
          price: 200,
          change: 2,
          changePercent: 1,
          volume: 2000,
          updatedAt: Date.now(),
        },
      ],
      source: "yahoo" as const,
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    }));

    const service = {
      getTwsProvider: () => ({
        getClient: () => ({
          getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 5000 }),
        }),
      }),
      getQuotes,
      getWatchlistQuotes: vi.fn(),
    } as unknown as MarketDataService;

    const events: string[] = [];
    const session = createTwsQuoteStreamSession(service, { symbols: ["MSFT"] });
    session.start((payload) => events.push(payload));
    await Promise.resolve();
    await Promise.resolve();

    expect(getQuotes).toHaveBeenCalled();
    session.stop();
  });
});
