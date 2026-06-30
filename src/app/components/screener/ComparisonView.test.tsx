/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComparisonView from "./ComparisonView";
import type { ScreenerResultRow } from "@/lib/screener/types";

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [], loading: false, error: null }),
}));

const row = (symbol: string, changePercent: number): ScreenerResultRow => ({
  symbol,
  name: `${symbol} Inc.`,
  price: 100,
  change: 1,
  changePercent,
  exchange: "NASDAQ",
  volume: 1_000_000,
  sector: "Technology",
  industry: "Software",
  country: "US",
  beta: 1.2,
  marketCap: 10_000_000_000,
  dividendYield: 0.01,
});

describe("ComparisonView", () => {
  it("renders selected symbols with indicator metric columns", () => {
    render(
      <ComparisonView
        rows={[row("AAPL", 1.5), row("MSFT", -0.5)]}
        indicatorValues={{
          AAPL: { histogram: 0.42 },
          MSFT: { histogram: -0.12 },
        }}
      />,
    );

    expect(screen.getByTestId("comparison-row-AAPL")).toBeTruthy();
    expect(screen.getByTestId("comparison-row-MSFT")).toBeTruthy();
    expect(screen.getByTestId("comparison-sort-indicator:histogram")).toBeTruthy();
  });

  it("sorts rows when a metric header is clicked", () => {
    render(
      <ComparisonView rows={[row("AAPL", 1.5), row("MSFT", -0.5)]} />,
    );

    fireEvent.click(screen.getByTestId("comparison-sort-changePercent"));
    const symbols = screen
      .getAllByTestId(/comparison-row-/)
      .map((node) => node.getAttribute("data-testid")?.replace("comparison-row-", ""));
    expect(symbols[0]).toBe("MSFT");
  });
});
