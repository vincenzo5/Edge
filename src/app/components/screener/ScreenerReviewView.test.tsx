/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ScreenerReviewView from "./ScreenerReviewView";
import { ScreenerProvider } from "./ScreenerProvider";
import { WatchlistProvider } from "../watchlist/WatchlistContext";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { REVIEW_KEEPERS_WATCHLIST_NAME } from "@/lib/screener/reviewSession";

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [], loading: false, error: null }),
}));

vi.mock("@/lib/screener/reviewChannel", () => ({
  publishReviewSetSymbol: vi.fn(),
}));

function makeRow(symbol: string, name = `${symbol} Inc.`): ScreenerResultRow {
  return {
    symbol,
    name,
    price: 100,
    change: 1,
    changePercent: 1,
    exchange: "NASDAQ",
    volume: 1_000_000,
    sector: "Technology",
    industry: "Software",
    country: "US",
    beta: 1.1,
    marketCap: 1_000_000_000,
    dividendYield: null,
  };
}

const ROWS = [makeRow("AAPL"), makeRow("MSFT"), makeRow("GOOG")];

function renderReviewView({
  withRun = true,
  reviewIndex = 0,
  reviewActive = true,
}: {
  withRun?: boolean;
  reviewIndex?: number;
  reviewActive?: boolean;
} = {}) {
  const initialSession = {
    ...createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
    ...(withRun
      ? {
          lastRun: {
            rows: ROWS,
            meta: {
              source: "fmp" as const,
              warnings: [],
              skippedSymbols: [],
              stale: false,
            },
          },
          reviewActive,
          reviewIndex,
        }
      : {}),
  };

  return render(
    <WatchlistProvider initialState={DEFAULT_WATCHLIST_STATE}>
      <ScreenerProvider initialState={DEFAULT_SCREENER_STATE} initialSession={initialSession}>
        <ScreenerReviewView />
      </ScreenerProvider>
    </WatchlistProvider>,
  );
}

describe("ScreenerReviewView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("advances review index on ArrowDown", async () => {
    renderReviewView({ reviewIndex: 0 });

    expect(screen.getByTestId("screener-review-progress")).toHaveTextContent("1 / 3");
    expect(screen.getByTestId("screener-review-current-symbol")).toHaveTextContent("AAPL");

    fireEvent.keyDown(window, { key: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByTestId("screener-review-progress")).toHaveTextContent("2 / 3");
      expect(screen.getByTestId("screener-review-current-symbol")).toHaveTextContent("GOOG");
    });
  });

  it("keeps the current symbol on Space", async () => {
    renderReviewView({ reviewIndex: 0 });

    fireEvent.keyDown(window, { key: " ", code: "Space" });

    await waitFor(() => {
      expect(screen.getByTestId("screener-review-keeper-AAPL")).toBeTruthy();
      expect(screen.getByTestId("screener-review-progress")).toHaveTextContent("2 / 3");
      expect(screen.getByTestId("screener-review-current-symbol")).toHaveTextContent("GOOG");
    });

    const keepers = screen
      .getByTestId("screener-review-keepers")
      .querySelectorAll("[data-testid^='screener-review-keeper-']");
    expect(keepers).toHaveLength(1);
  });

  it("shows empty state with link to screens when no run exists", () => {
    renderReviewView({ withRun: false });

    expect(screen.getByTestId("screener-review-empty")).toBeTruthy();
    expect(screen.getByTestId("screener-review-empty-cta")).toHaveAttribute(
      "href",
      "/screener/screens",
    );
  });

  it("adds kept symbol to Keepers watchlist", async () => {
    renderReviewView({ reviewIndex: 0 });

    fireEvent.keyDown(window, { key: " ", code: "Space" });

    await waitFor(() => {
      expect(screen.getByTestId("screener-review-keeper-AAPL")).toBeTruthy();
    });

    await waitFor(
      () => {
        const raw = window.localStorage.getItem("tv-ai:watchlists:v1");
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw!) as {
          watchlists: Array<{ name: string; items: Array<{ symbol: string }> }>;
        };
        const keepers = parsed.watchlists.find(
          (list) => list.name === REVIEW_KEEPERS_WATCHLIST_NAME,
        );
        expect(keepers?.items.map((item) => item.symbol)).toEqual(["AAPL"]);
      },
      { timeout: 1000 },
    );
  });
});
