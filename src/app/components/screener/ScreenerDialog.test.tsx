/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
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

function renderDialog(props?: Partial<React.ComponentProps<typeof ScreenerDialog>>) {
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

  it("renders screens and runs a screener screen", async () => {
    renderDialog();
    expect(screen.getByTestId("screener-dialog")).toBeTruthy();
    fireEvent.click(screen.getByTestId("screener-screen-large-cap-dividend"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
    expect(screen.getByText("AAPL")).toBeTruthy();
  });

  it("runs custom query from query builder", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.click(screen.getByTestId("screener-run-button"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
  });

  it("selecting a row closes dialog when chart actions are available", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByTestId("screener-screen-gainers"));
    fireEvent.click(await screen.findByTestId("screener-row-NVDA"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows two-phase loading label for technical screens", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    let resolveFetch: ((value: Awaited<ReturnType<typeof fetchScreenerResults>>) => void) | undefined;
    vi.mocked(fetchScreenerResults).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderDialog();
    fireEvent.click(screen.getByTestId("screener-screen-rsi-oversold"));
    expect(screen.getByTestId("screener-loading-label")).toHaveTextContent(
      "Step 1: FMP prefilter → Step 2: Computing technicals…",
    );

    resolveFetch?.({
      rows: [],
      meta: { source: "fmp", warnings: [], skippedSymbols: [], stale: false },
    });
    await screen.findByTestId("screener-results-empty");
  });

  it("shows technical rule in builder after macd screen", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-screen-macd-bullish"));
    await screen.findByTestId("screener-results-table");
    fireEvent.click(screen.getByTestId("screener-edit-filters"));
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

  it("keeps phase detail on results count tooltip instead of a status line", async () => {
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
    fireEvent.click(screen.getByTestId("screener-screen-rsi-oversold"));
    const count = await screen.findByTestId("screener-results-count");
    expect(count).toHaveTextContent("1 result");
    expect(count).toHaveAttribute(
      "title",
      "Step 1: 120 prefiltered → Step 2: 1 matched (120 evaluated)",
    );
    expect(screen.queryByTestId("screener-phase-summary")).toBeNull();
  });

  it("runs custom query on Cmd/Ctrl+Enter", async () => {
    const { fetchScreenerResults } = await import("@/lib/chartDataFeed/apiScreenerFeed");
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
    expect(fetchScreenerResults).toHaveBeenCalled();
  });

  it("keeps Run in modal header and Save in the Screens rail", () => {
    renderDialog();
    expect(
      screen.getByTestId("screener-run-button").closest("[data-testid='edge-modal-header-actions']"),
    ).toBeTruthy();
    expect(screen.getByTestId("screener-screens-save-slot")).toContainElement(
      screen.getByTestId("screener-save-open"),
    );
    fireEvent.click(screen.getByTestId("screener-save-open"));
    expect(screen.getByTestId("screener-save-name")).toBeTruthy();
    expect(screen.getByTestId("screener-save-button")).toBeTruthy();
  });

  it("shows the selected screen name after loading a saved screen", async () => {
    renderDialog();
    expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent("Untitled screen");
    fireEvent.click(screen.getByTestId("screener-screen-large-cap-dividend"));
    await screen.findByTestId("screener-results-table");
    expect(screen.getByTestId("screener-active-screen-name")).toHaveTextContent(/dividend/i);
    expect(screen.getByTestId("screener-screen-active-row")).toBeTruthy();
  });

  it("shows never-run placeholder before first screen run", () => {
    renderDialog();
    expect(screen.getByTestId("screener-results-never-run")).toBeTruthy();
    expect(screen.queryByTestId("screener-results-empty")).toBeNull();
    expect(screen.getByTestId("screener-never-run-hint")).toBeTruthy();
  });

  it("enters scan mode with filter chips after a successful screen run", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-screen-large-cap-dividend"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();
    expect(screen.getByTestId("screener-scan-summary")).toBeTruthy();
    expect(screen.getByTestId("screener-filter-chip-summary")).toBeTruthy();
    expect(screen.queryByTestId("screener-rules-scroll")).toBeNull();
  });

  it("restores query builder from scan mode via Edit filters", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-screen-large-cap-dividend"));
    await screen.findByTestId("screener-scan-summary");
    fireEvent.click(screen.getByTestId("screener-edit-filters"));
    expect(screen.getByTestId("screener-query-builder")).toBeTruthy();
    expect(screen.queryByTestId("screener-scan-summary")).toBeNull();
  });

  it("shows limit select before run button in custom query header", () => {
    renderDialog();
    const limitSelect = screen.getByTestId("screener-limit-select");
    expect(limitSelect).toBeTruthy();
    expect(limitSelect.tagName).toBe("SELECT");
    expect(Array.from(limitSelect.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Top 50",
      "Top 100",
      "Top 200",
      "Top 500",
    ]);
    expect(screen.getByTestId("screener-run-button")).toBeTruthy();
  });

  it("shows run shortcut hint in custom query header", () => {
    renderDialog();
    expect(screen.getByTestId("screener-run-shortcut-hint")).toHaveTextContent("⌘↵");
    expect(screen.getByTestId("screener-run-button")).toBeTruthy();
  });

  it("keeps screens rail separate from scrollable results region after a run", async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId("screener-screen-large-cap-dividend"));
    expect(await screen.findByTestId("screener-results-table")).toBeTruthy();

    const aside = screen.getByTestId("screener-screens-aside");
    expect(aside.className).toContain("shrink-0");
    expect(aside.className).toContain("self-stretch");

    const scrollRegion = screen.getByTestId("screener-results-scroll");
    expect(scrollRegion.className).toContain("overflow-auto");
    expect(scrollRegion.className).toContain("min-h-0");
    expect(scrollRegion.className).toContain("flex-1");
    expect(screen.getByTestId("screener-results-view").className).toContain("overflow-hidden");
  });
});
