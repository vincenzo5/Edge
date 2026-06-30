/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResultsTable from "./ResultsTable";
import type { ScreenerResultRow } from "@/lib/screener/types";

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
        onLoadChart={vi.fn()}
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
        onLoadChart={vi.fn()}
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

  it("renders group action buttons and invokes handlers", () => {
    const onAddAll = vi.fn();
    const onCreateWatchlist = vi.fn();

    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "symbol", direction: "asc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onLoadChart={vi.fn()}
        onAddToWatchlist={vi.fn()}
        onAddAllToWatchlist={onAddAll}
        onCreateWatchlistFromResults={onCreateWatchlist}
      />,
    );

    fireEvent.click(screen.getByTestId("screener-add-all-watchlist"));
    fireEvent.click(screen.getByTestId("screener-create-watchlist"));
    expect(onAddAll).toHaveBeenCalledTimes(1);
    expect(onCreateWatchlist).toHaveBeenCalledTimes(1);
  });

  it("shows sort arrow on active column header", () => {
    render(
      <ResultsTable
        rows={[sampleRow]}
        sort={{ column: "price", direction: "desc" }}
        page={0}
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onLoadChart={vi.fn()}
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
        onLoadChart={vi.fn()}
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
        onLoadChart={vi.fn()}
        onAddToWatchlist={vi.fn()}
      />,
    );

    expect(screen.getByTestId("screener-indicator-cell-AAPL-rsi")).toHaveTextContent("25");
    fireEvent.click(screen.getByTestId("screener-sort-indicator-rsi"));
    expect(onSortChange).toHaveBeenCalled();
  });
});
