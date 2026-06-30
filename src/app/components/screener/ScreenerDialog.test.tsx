/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, type ComponentProps } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScreenerDialog from "./ScreenerDialog";
import { ScreenerProvider } from "./ScreenerProvider";
import { ChartActionsProvider } from "../ChartActionsContext";
import { WatchlistProvider } from "../watchlist/WatchlistContext";
import { MarketDataProvider } from "../MarketDataProvider";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

vi.mock("@/lib/chartDataFeed/apiScreenerFeed", () => ({
  fetchScreenerResults: vi.fn(async () => ({
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
    ],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
  fetchMarketMoverResults: vi.fn(async () => ({
    rows: [
      {
        symbol: "NVDA",
        name: "NVIDIA",
        price: 100,
        change: 1,
        changePercent: 1,
        exchange: "NASDAQ",
        volume: 1000,
        sector: null,
        industry: null,
        country: null,
        beta: null,
        marketCap: null,
        dividendYield: null,
      },
    ],
    meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
  })),
}));

function renderDialog(props?: Partial<ComponentProps<typeof ScreenerDialog>>) {
  return render(
    <WatchlistProvider>
      <ScreenerProvider>
        <MarketDataProvider layout={DEFAULT_LAYOUT}>
          <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
            <ScreenerDialog open onClose={vi.fn()} {...props} />
          </ChartActionsProvider>
        </MarketDataProvider>
      </ScreenerProvider>
    </WatchlistProvider>,
  );
}

describe("ScreenerDialog", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const { fetchScreenerResults, fetchMarketMoverResults } = await import(
      "@/lib/chartDataFeed/apiScreenerFeed"
    );
    vi.mocked(fetchScreenerResults).mockClear();
    vi.mocked(fetchMarketMoverResults).mockClear();
  });

  it("renders presets and runs a screener preset", async () => {
    renderDialog();
    expect(screen.getByTestId("screener-dialog")).toBeTruthy();
    fireEvent.click(screen.getByTestId("screener-preset-large-cap-dividend"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
    expect(screen.getByText("AAPL")).toBeTruthy();
  });

  it("runs custom query from query builder", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.click(screen.getByTestId("screener-run-button"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
  });

  it("loads chart action closes dialog", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByTestId("screener-preset-gainers"));
    fireEvent.click(await screen.findByTestId("screener-load-NVDA"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows two-phase loading label for technical presets", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    let resolveFetch: ((value: Awaited<ReturnType<typeof fetchScreenerResults>>) => void) | undefined;
    vi.mocked(fetchScreenerResults).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderDialog();
    fireEvent.click(screen.getByTestId("screener-preset-rsi-oversold"));
    expect(screen.getByTestId("screener-loading-label")).toHaveTextContent(
      "Step 1: FMP prefilter → Step 2: Computing technicals…",
    );

    resolveFetch?.({
      rows: [],
      meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
    });
    await screen.findByTestId("screener-results-empty");
  });

  it("shows technical rule in builder after macd preset", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-preset-macd-bullish"));
    expect(await screen.findByTestId("screener-technical-rule-rule-technical")).toBeTruthy();
    fireEvent.click(screen.getByTestId("screener-rule-toggle-rule-technical"));
    expect(screen.getByTestId("screener-technical-indicator-rule-technical")).toHaveValue("MACD");
  });

  it("blocks run when technical rule is invalid", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-add-technical-rule"));
    const indicatorSelect = await screen.findByTestId(/screener-technical-indicator-/);
    fireEvent.change(indicatorSelect, { target: { value: "MACD" } });
    const seriesSelect = screen.getByTestId(/screener-technical-series-/);
    fireEvent.change(seriesSelect, { target: { value: "rsi" } });
    fireEvent.click(screen.getByTestId("screener-run-button"));
    expect(await screen.findByTestId("screener-results-error")).toBeTruthy();
    expect(fetchScreenerResults).not.toHaveBeenCalled();
  });

  it("renders phase summary when meta includes screener phases", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    vi.mocked(fetchScreenerResults).mockResolvedValueOnce({
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
      ],
      meta: {
        source: "fmp",
        warnings: [],
        skippedSymbols: [],
        stale: false,
        phases: { step1Count: 120, step2Count: 120, matchedCount: 1 },
      },
    });

    renderDialog();
    fireEvent.click(screen.getByTestId("screener-preset-rsi-oversold"));
    expect(await screen.findByTestId("screener-phase-summary")).toHaveTextContent(
      "Step 1: 120 prefiltered → Step 2: 1 matched (120 evaluated)",
    );
  });

  it("runs custom query on Cmd/Ctrl+Enter", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
    expect(fetchScreenerResults).toHaveBeenCalled();
  });

  it("renders save controls in modal header", () => {
    renderDialog();
    const saveInput = screen.getByTestId("screener-save-name");
    expect(saveInput.closest("[data-testid='edge-modal-header-actions']")).toBeTruthy();
    expect(screen.getByTestId("screener-save-button")).toBeTruthy();
  });

  it("renders limit input in modal footer", () => {
    renderDialog();
    expect(screen.getByTestId("screener-limit-input")).toBeTruthy();
  });

  it("shows run shortcut hint in custom query header", () => {
    renderDialog();
    expect(screen.getByTestId("screener-run-shortcut-hint")).toHaveTextContent("⌘↵");
    expect(screen.getByTestId("screener-run-button")).toBeTruthy();
  });
});
