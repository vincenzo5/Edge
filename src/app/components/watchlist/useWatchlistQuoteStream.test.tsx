import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { useWatchlistQuoteStream } from "./useWatchlistQuoteStream";
import React from "react";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotes: () => null,
  useMarketDataQuotesForSymbols: () => ({ quotes: [], loading: false, error: null }),
}));

vi.mock("@/lib/watchlist/quoteClient", () => ({
  fetchQuotes: vi.fn(async () => [
    {
      symbol: "AAPL",
      regularMarketPrice: 200,
      regularMarketChange: 1,
      regularMarketChangePercent: 0.5,
      regularMarketVolume: 1000,
      updatedAt: Date.now(),
    },
  ]),
}));

function QuoteProbe({ symbols }: { symbols: string[] }) {
  const { quotes, loading, error } = useWatchlistQuoteStream(symbols);
  return (
    <div>
      <span data-testid="quote-count">{quotes.length}</span>
      <span data-testid="quote-loading">{String(loading)}</span>
      <span data-testid="quote-error">{error ?? ""}</span>
    </div>
  );
}

describe("useWatchlistQuoteStream legacy path", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("falls back to REST when SSE disconnects", async () => {
    render(<QuoteProbe symbols={["AAPL"]} />);

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
    });

    MockEventSource.instances[0]?.onerror?.();

    await waitFor(() => {
      expect(document.querySelector('[data-testid="quote-count"]')?.textContent).toBe("1");
      expect(document.querySelector('[data-testid="quote-error"]')?.textContent).toBe("");
    });

    expect(MockEventSource.instances[0]?.closed).toBe(true);
  });

  it("falls back to REST after cold SSE first-paint timeout", async () => {
    vi.useFakeTimers();
    render(<QuoteProbe symbols={["AAPL"]} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(document.querySelector('[data-testid="quote-count"]')?.textContent).toBe("1");
  });
});
