/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScreenerResultsBody } from "./ScreenerResultsBody";
import { ScreenerProvider } from "./ScreenerProvider";
import { MarketDataProvider } from "../MarketDataProvider";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";

vi.mock("./useScreenerReviewDrive", () => ({
  useScreenerReviewDrive: vi.fn(),
}));

vi.mock("@/lib/chartDataFeed/apiScreenerFeed", () => ({
  fetchScreenerResults: vi.fn(async () => ({
    rows: [],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
  fetchMarketMoverResults: vi.fn(async () => ({
    rows: [],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
}));

function renderResultsBody(session?: Partial<ScreenerSessionState>) {
  const initialSession = {
    ...createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
    lastRun: {
      rows: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 200,
          change: 1,
          changePercent: 0.5,
          exchange: "NASDAQ",
          volume: 1_000_000,
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          beta: 1.1,
          marketCap: 3_000_000_000_000,
          dividendYield: 0.005,
        },
        {
          symbol: "MSFT",
          name: "Microsoft",
          price: 400,
          change: 2,
          changePercent: 0.5,
          exchange: "NASDAQ",
          volume: 900_000,
          sector: "Technology",
          industry: "Software",
          country: "US",
          beta: 1.0,
          marketCap: 2_000_000_000_000,
          dividendYield: 0.008,
        },
      ],
      meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
    },
    ...session,
  };

  return render(
    <ScreenerProvider initialState={DEFAULT_SCREENER_STATE} initialSession={initialSession}>
      <MarketDataProvider layout={DEFAULT_LAYOUT}>
        <ScreenerResultsBody active variant="app" embedded />
      </MarketDataProvider>
    </ScreenerProvider>,
  );
}

describe("ScreenerResultsBody", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("selects a row on click and highlights it", async () => {
    renderResultsBody();
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();

    fireEvent.click(screen.getByTestId("screener-row-MSFT"));
    expect(screen.getByTestId("screener-row-MSFT").getAttribute("aria-selected")).toBe("true");
  });

  it("advances selection on ArrowDown", async () => {
    renderResultsBody({ reviewIndex: 0, reviewActive: true });
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByTestId("screener-row-MSFT").getAttribute("aria-selected")).toBe("true");
  });
});
