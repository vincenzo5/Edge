/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { mergeScreenerQuoteOverlay } from "./useScreenerQuoteOverlay";
import type { ScreenerResultRow } from "@/lib/screener/types";

const row: ScreenerResultRow = {
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 100,
  change: 0,
  changePercent: 0,
  exchange: "NASDAQ",
  volume: 1000,
  sector: "Technology",
  industry: null,
  country: "US",
  beta: 1,
  marketCap: 1,
  dividendYield: null,
};

describe("mergeScreenerQuoteOverlay", () => {
  it("merges live quote fields into screener rows", () => {
    const merged = mergeScreenerQuoteOverlay([row], [
      {
        symbol: "AAPL",
        regularMarketPrice: 105,
        regularMarketChange: 5,
        regularMarketChangePercent: 5,
        regularMarketVolume: 2000,
        updatedAt: Date.now(),
      },
    ]);
    expect(merged[0]?.price).toBe(105);
    expect(merged[0]?.changePercent).toBe(5);
    expect(merged[0]?.volume).toBe(2000);
  });

  it("returns original rows when no quotes match", () => {
    expect(mergeScreenerQuoteOverlay([row], [])).toEqual([row]);
  });
});
