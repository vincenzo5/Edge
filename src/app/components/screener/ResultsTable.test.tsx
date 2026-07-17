/** @vitest-environment jsdom */
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResultsTable from "./ResultsTable";
import type { ScreenerResultRow } from "@/lib/screener/types";
import type { HeatMapConfig } from "@/lib/heatmap/types";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";
import type { ScreenerResultsViewMode } from "@/lib/screener/screenerSession";

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [], loading: false, error: null }),
}));

const sampleRow: ScreenerResultRow = {
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
};

describe("ResultsTable group actions and export", () => {
  it("shows compare selected when rows are checked", () => {
    const onCompare = vi.fn();
    render(
      <ResultsTable
        rows={[sampleRow, { ...sampleRow, symbol: "MSFT", name: "Microsoft" }]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        selectedCompareSymbols={["AAPL"]}
        onToggleCompareSymbol={vi.fn()}
        onCompareSelected={onCompare}
      />,
    );

    fireEvent.click(screen.getByTestId("screener-compare-selected"));
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it("renders provider warnings and skipped symbols separately", () => {
    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        warnings={["Massive plan restricted (403): current-day data unavailable before market close on this tier."]}
        skippedSymbols={["ANTM", "TWTR", "PXD"]}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-provider-warnings")).toHaveTextContent("Massive plan restricted");
    expect(screen.getByTestId("screener-skipped-symbols")).toHaveTextContent("3 symbols skipped");
    expect(screen.getByTestId("screener-skipped-symbols")).toHaveAttribute(
      "title",
      "ANTM, TWTR, PXD",
    );
  });

  it("renders watchlist/export menus and invokes handlers", () => {
    const onAddAll = vi.fn();
    const onCreateWatchlist = vi.fn();

    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        onAddAllToWatchlist={onAddAll}
        onCreateWatchlistFromResults={onCreateWatchlist}
      />,
    );

    expect(screen.getByTestId("screener-results-toolbar")).toBeTruthy();
    expect(screen.getByTestId("screener-results-count")).toHaveTextContent("1 result");
    expect(screen.getByTestId("screener-live-badge")).toHaveAttribute(
      "title",
      "Live prices on first 1 visible rows.",
    );
    expect(screen.queryByTestId("screener-phase-summary")).toBeNull();
    expect(screen.queryByTestId("screener-live-caption")).toBeNull();

    fireEvent.click(screen.getByTestId("screener-watchlist-menu"));
    fireEvent.click(screen.getByTestId("screener-add-all-watchlist"));
    fireEvent.click(screen.getByTestId("screener-watchlist-menu"));
    fireEvent.click(screen.getByTestId("screener-create-watchlist"));
    expect(onAddAll).toHaveBeenCalledTimes(1);
    expect(onCreateWatchlist).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("screener-export-menu"));
    expect(screen.getByTestId("screener-export-csv")).toBeTruthy();
    expect(screen.getByTestId("screener-copy-symbols")).toBeTruthy();
  });

  it("hides bulk action menus when there are zero results", () => {
    render(
      <ResultsTable
        rows={[]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        hasRun
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        onAddAllToWatchlist={vi.fn()}
        onCreateWatchlistFromResults={vi.fn()}
        onResultsViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-results-toolbar")).toBeTruthy();
    expect(screen.getByTestId("screener-results-count")).toHaveTextContent("0 results");
    expect(screen.queryByTestId("screener-watchlist-menu")).toBeNull();
    expect(screen.queryByTestId("screener-export-menu")).toBeNull();
    expect(screen.getByTestId("screener-results-empty")).toBeTruthy();
  });

  it("shows sort arrow on active column header", () => {
    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "price", direction: "desc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-sort-price")).toHaveTextContent("▼");
  });

  it("renders country and change cells", () => {
    render(
      <ResultsTable
        rows={[sampleRow]}
        columns={["symbol", "country", "change"]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
      />,
    );

    expect(screen.getByText("US")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("renders and sorts indicator columns", () => {
    const onSortChange = vi.fn();
    render(
      <ResultsTable
        rows={[
          sampleRow,
          { ...sampleRow, symbol: "MSFT", name: "Microsoft" },
        ]}
        columns={["symbol"]}
        indicatorColumns={[{ key: "rsi", label: "RSI" }]}
        indicatorValues={{
          AAPL: { rsi: 25 },
          MSFT: { rsi: 70 },
        }}
        sort={{ column: "rsi", direction: "desc" }}
        page={0}
        onSortChange={onSortChange}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-indicator-cell-AAPL-rsi")).toHaveTextContent("25");
    fireEvent.click(screen.getByTestId("screener-sort-indicator-rsi"));
    expect(onSortChange).toHaveBeenCalled();
  });

  it("renders heat map view when resultsViewMode is heatmap", () => {
    render(
      <ResultsTable
        rows={[sampleRow, { ...sampleRow, symbol: "MSFT", name: "Microsoft" }]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        resultsViewMode="heatmap"
        onResultsViewModeChange={vi.fn()}
        heatMapConfig={DEFAULT_HEAT_MAP_CONFIG}
        onHeatMapConfigChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-results-heatmap")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("screener-sort-symbol")).not.toBeInTheDocument();
  });

  it("switches view mode via compact select", () => {
    const onResultsViewModeChange = vi.fn();

    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        resultsViewMode="list"
        onResultsViewModeChange={onResultsViewModeChange}
        heatMapConfig={DEFAULT_HEAT_MAP_CONFIG}
        onHeatMapConfigChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("screener-results-view-select"), {
      target: { value: "heatmap" },
    });
    expect(onResultsViewModeChange).toHaveBeenCalledWith("heatmap");
  });

  it("updates heat map immediately when size/color/group config changes", () => {
    const rows: ScreenerResultRow[] = [
      sampleRow,
      {
        ...sampleRow,
        symbol: "MSFT",
        name: "Microsoft",
        marketCap: 2_800_000_000_000,
        changePercent: -0.4,
        sector: "Technology",
        industry: "Software",
      },
      {
        ...sampleRow,
        symbol: "XOM",
        name: "Exxon",
        marketCap: 400_000_000_000,
        changePercent: -1.1,
        sector: "Energy",
        industry: "Oil & Gas",
        volume: 20_000_000,
      },
    ];

    function StatefulResults() {
      const [resultsViewMode, setResultsViewMode] =
        useState<ScreenerResultsViewMode>("heatmap");
      const [heatMapConfig, setHeatMapConfig] =
        useState<HeatMapConfig>(DEFAULT_HEAT_MAP_CONFIG);
      return (
        <ResultsTable
          rows={rows}
          sort={{ column: "symbol", direction: "asc" }}
          page={0}
          onSortChange={vi.fn()}
          onPageChange={vi.fn()}
          onSelectRow={vi.fn()}
          onAddToWatchlist={vi.fn()}
          resultsViewMode={resultsViewMode}
          onResultsViewModeChange={setResultsViewMode}
          heatMapConfig={heatMapConfig}
          onHeatMapConfigChange={setHeatMapConfig}
        />
      );
    }

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 600;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 400;
      },
    });

    render(<StatefulResults />);

    expect(screen.getByTestId("heatmap-group-Technology")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-group-Energy")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("heatmap-group-by"), {
      target: { value: "none" },
    });
    expect(screen.queryByTestId("heatmap-group-Technology")).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("heatmap-size-by"), {
      target: { value: "equal" },
    });
    expect(screen.getByTestId("heatmap-size-by")).toHaveValue("equal");

    fireEvent.change(screen.getByTestId("heatmap-color-by"), {
      target: { value: "volume" },
    });
    expect(screen.getByTestId("heatmap-color-by")).toHaveValue("volume");
    expect(screen.getByTestId("heatmap-leaf-AAPL").getAttribute("title")).toMatch(/1\.0M|1000000|1,000,000/i);
  });

  it("shows size coverage warning when most heat map items lack market cap", () => {
    const rows: ScreenerResultRow[] = [
      { ...sampleRow, marketCap: null },
      { ...sampleRow, symbol: "MSFT", name: "Microsoft", marketCap: null },
      { ...sampleRow, symbol: "XOM", name: "Exxon", marketCap: null },
    ];

    render(
      <ResultsTable
        rows={rows}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onSelectRow={vi.fn()}
        onAddToWatchlist={vi.fn()}
        resultsViewMode="heatmap"
        onResultsViewModeChange={vi.fn()}
        heatMapConfig={DEFAULT_HEAT_MAP_CONFIG}
        onHeatMapConfigChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("heatmap-size-coverage-warning")).toHaveTextContent(
      /Market cap unavailable/,
    );
  });
});
