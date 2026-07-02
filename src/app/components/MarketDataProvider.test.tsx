import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MarketDataProvider } from "./MarketDataProvider";
import type { ChartLayout } from "@/lib/chartConfig";

vi.mock("./watchlist/WatchlistContext", () => ({
  useWatchlistActions: () => ({
    state: {
      watchlists: [{ id: "default", name: "Default", items: [{ symbol: "AAPL" }] }],
      activeWatchlistId: "default",
    },
  }),
}));

vi.mock("./screener/ScreenerProvider", () => ({
  useScreenerStateOptional: () => null,
}));

vi.mock("@/lib/marketData/telemetry", () => ({
  createMarketDataTraceId: () => "trace-test",
  marketDataTraceHeaders: () => ({}),
  recordMarketDataTelemetry: vi.fn(),
}));

const layout: ChartLayout = {
  gridMode: "1x1",
  cells: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
  activeCellIndex: 0,
  linked: false,
  linkSymbol: false,
  linkInterval: false,
  linkRange: false,
  linkCrosshair: false,
  linkDrawings: false,
};

describe("MarketDataProvider quotes", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WATCHLIST_STREAM", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads watchlist quotes via REST when SSE is disabled", async () => {
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
});
