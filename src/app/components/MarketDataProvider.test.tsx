import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MarketDataProvider, useMarketDataQuotes } from "./MarketDataProvider";
import type { ChartLayout } from "@/lib/chartConfig";

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

vi.mock("./screener/ScreenerProvider", () => ({
  useScreenerStateOptional: () => null,
}));

vi.mock("@/lib/marketData/telemetry", () => ({
  createMarketDataTraceId: () => "trace-test",
  marketDataTraceHeaders: () => ({}),
  recordMarketDataTelemetry: vi.fn(),
}));

const recordHealthEventMock = vi.fn();
vi.mock("@/lib/marketData/healthEvents", () => ({
  recordHealthEvent: (...args: unknown[]) => recordHealthEventMock(...args),
  getHealthEvents: () => [],
  subscribeHealthEvents: () => () => {},
  resetHealthEventsForTests: () => {},
}));

const mockWatchlistState = {
  watchlists: [{ id: "default", name: "Default", items: [{ symbol: "AAPL" }] }],
  activeWatchlistId: "default",
};

vi.mock("./watchlist/WatchlistContext", () => ({
  useWatchlistActions: () => ({
    state: mockWatchlistState,
  }),
}));

const layout: ChartLayout = {
  version: 1,
  layoutId: "n1",
  cells: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
  activeCellIndex: 0,
  linked: false,
  linkSymbol: false,
  linkInterval: false,
  linkRange: false,
  linkCrosshair: false,
  linkDrawings: false,
};

function QuoteStatusProbe() {
  const marketData = useMarketDataQuotes();
  const aapl = marketData?.quotesBySymbol.get("AAPL");
  return (
    <div>
      <span data-testid="quote-transport">{marketData?.quotesTransport ?? "none"}</span>
      <span data-testid="quote-error">{marketData?.quoteError ?? ""}</span>
      <span data-testid="quote-count">{marketData?.quotesBySymbol.size ?? 0}</span>
      <span data-testid="quote-price">{aapl?.regularMarketPrice ?? ""}</span>
      <span data-testid="quote-change-pct">{aapl?.regularMarketChangePercent ?? ""}</span>
      <span data-testid="quote-warnings">
        {JSON.stringify(marketData?.quotesMeta?.warnings ?? [])}
      </span>
      <span data-testid="quote-asof">{marketData?.quotesMeta?.asOf ?? ""}</span>
    </div>
  );
}

describe("MarketDataProvider quotes", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    recordHealthEventMock.mockClear();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads watchlist quotes via REST when SSE is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "0");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        return new Response(
          JSON.stringify({
            quotes: [
              {
                symbol: "AAPL",
                regularMarketPrice: 123,
                regularMarketChange: 1,
                regularMarketChangePercent: 1,
                regularMarketVolume: 1000,
                updatedAt: Date.now(),
              },
            ],
            meta: { source: "yahoo" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <div />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/quotes"))).toBe(true);
    });
  });

  it("does not duplicate quote fetch via warmup on startup", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "1");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      if (url.includes("/api/quotes")) {
        return new Response(JSON.stringify({ quotes: [], meta: { source: "yahoo" } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/market-data/warmup"))).toBe(
        true,
      );
    });

    const quoteCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/quotes"));
    expect(quoteCalls.length).toBe(0);
  });

  it("falls back to REST after cold SSE first-paint timeout", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "1");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        return new Response(
          JSON.stringify({
            quotes: [
              {
                symbol: "AAPL",
                regularMarketPrice: 175,
                regularMarketChange: 1,
                regularMarketChangePercent: 1,
                regularMarketVolume: 1000,
                updatedAt: Date.now(),
              },
            ],
            meta: { source: "yahoo" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(document.querySelector('[data-testid="quote-transport"]')?.textContent).toBe("rest");
    expect(document.querySelector('[data-testid="quote-count"]')?.textContent).toBe("1");
    expect(document.querySelector('[data-testid="quote-warnings"]')?.textContent).not.toContain(
      "timeout",
    );
    expect(recordHealthEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "transport_fallback",
        recovered: true,
        dataset: "watchlist",
      }),
    );
  });

  it("falls back to REST when SSE disconnects", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "1");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        return new Response(
          JSON.stringify({
            quotes: [
              {
                symbol: "AAPL",
                regularMarketPrice: 150,
                regularMarketChange: 2,
                regularMarketChangePercent: 1.5,
                regularMarketVolume: 2000,
                updatedAt: Date.now(),
              },
            ],
            meta: { source: "yahoo" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
    });

    MockEventSource.instances[0]?.onerror?.();

    await waitFor(() => {
      expect(document.querySelector('[data-testid="quote-transport"]')?.textContent).toBe("rest");
      expect(document.querySelector('[data-testid="quote-count"]')?.textContent).toBe("1");
    });
  });

  it("sets quoteError when REST fallback fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "0");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        return new Response(JSON.stringify({ error: "Quotes unavailable" }), { status: 500 });
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="quote-error"]')?.textContent).toMatch(
        /Quotes unavailable|Failed to load quotes|500/i,
      );
    });
  });

  it("sets quotesMeta.asOf from oldest quote updatedAt", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "0");
    const updatedAt = Date.now() - 8_000;
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        return new Response(
          JSON.stringify({
            quotes: [
              {
                symbol: "AAPL",
                regularMarketPrice: 123,
                regularMarketChange: 1,
                regularMarketChangePercent: 1,
                regularMarketVolume: 1000,
                updatedAt,
              },
            ],
            meta: { source: "tws", stale: true, asOf: Date.now() },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="quote-asof"]')?.textContent).toBe(
        String(updatedAt),
      );
    });
  });

  it("schedules silent revalidation when quote age exceeds display threshold", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "0");
    const updatedAt = Date.now() - 50_000;
    let quoteFetchCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/quotes")) {
        quoteFetchCount += 1;
        return new Response(
          JSON.stringify({
            quotes: [
              {
                symbol: "AAPL",
                regularMarketPrice: 123,
                regularMarketChange: 1,
                regularMarketChangePercent: 1,
                regularMarketVolume: 1000,
                updatedAt: quoteFetchCount > 1 ? Date.now() : updatedAt,
              },
            ],
            meta: {
              source: "tws",
              stale: quoteFetchCount === 1,
              asOf: quoteFetchCount > 1 ? Date.now() : updatedAt,
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(quoteFetchCount).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(quoteFetchCount).toBe(2);
  });

  it("maps MarketQuote SSE fields (price / changePercent) into QuoteSnapshot", async () => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "1");
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/market-data/warmup")) {
        return new Response(JSON.stringify({ ok: true, warmup: { phases: [] } }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MarketDataProvider layout={layout}>
        <QuoteStatusProbe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
    });

    act(() => {
      MockEventSource.instances[0]?.onmessage?.({
        data: JSON.stringify({
          type: "snapshot",
          quotes: [
            {
              symbol: "AAPL",
              price: 13.45,
              change: 0.23,
              changePercent: 1.72,
              volume: 1000,
              updatedAt: Date.now(),
            },
          ],
          meta: { source: "tws" },
        }),
      } as MessageEvent);
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="quote-count"]')?.textContent).toBe("1");
      expect(document.querySelector('[data-testid="quote-price"]')?.textContent).toBe("13.45");
      expect(document.querySelector('[data-testid="quote-change-pct"]')?.textContent).toBe("1.72");
    });
  });
});
