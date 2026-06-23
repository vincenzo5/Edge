import type { Interval as ChartInterval } from "@/lib/chart/contracts";
import type { Candle, Range, Interval as YahooInterval } from "@/lib/yahoo";
import type { FundamentalsSnapshot, QuoteSnapshot } from "@/lib/watchlist/types";

export type StockSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export type MarketDataPort = {
  searchSymbols: (query: string, limit?: number) => Promise<StockSearchResult[]>;
  getCandles: (args: {
    symbol: string;
    range: Range;
    interval: ChartInterval;
    before?: number;
    barCount?: number;
  }) => Promise<Candle[]>;
  getQuotes: (symbols: string[]) => Promise<QuoteSnapshot[]>;
  getFundamentals: (symbol: string) => Promise<FundamentalsSnapshot>;
};

/** Server-side port backed by yahoo.ts (used in API routes and MCP). */
export function createYahooMarketDataPort(
  yahoo: {
    searchSymbols: (q: string, limit?: number) => Promise<StockSearchResult[]>;
    getChartCandles: (
      symbol: string,
      range: Range,
      interval: YahooInterval,
    ) => Promise<Candle[]>;
    getChartCandlesBefore: (
      symbol: string,
      before: number,
      interval?: YahooInterval,
      barCount?: number,
    ) => Promise<Candle[]>;
    getQuoteSnapshots: (symbols: string[]) => Promise<QuoteSnapshot[]>;
    getFundamentalsSnapshot: (symbol: string) => Promise<FundamentalsSnapshot>;
  },
): MarketDataPort {
  return {
    searchSymbols: (query, limit) => yahoo.searchSymbols(query, limit),
    getCandles: async ({ symbol, range, interval, before, barCount }) => {
      const yahooInterval: YahooInterval = interval === "2h" ? "1h" : interval;
      if (before != null) {
        return yahoo.getChartCandlesBefore(symbol, before, yahooInterval, barCount);
      }
      return yahoo.getChartCandles(symbol, range, yahooInterval);
    },
    getQuotes: (symbols) => yahoo.getQuoteSnapshots(symbols),
    getFundamentals: (symbol) => yahoo.getFundamentalsSnapshot(symbol),
  };
}

/** Client-side port that calls existing Next.js API routes. */
export function createFetchMarketDataPort(
  baseUrl = "",
): MarketDataPort {
  return {
    async searchSymbols(query, limit = 8) {
      const res = await fetch(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Search failed");
      const json = (await res.json()) as { results: StockSearchResult[] };
      return json.results.slice(0, limit);
    },
    async getCandles({ symbol, range, interval, before, barCount }) {
      const res = await fetch(`${baseUrl}/api/candles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, range, interval, before, barCount }),
      });
      if (!res.ok) throw new Error("Candles fetch failed");
      const json = (await res.json()) as { candles: Candle[] };
      return json.candles;
    },
    async getQuotes(symbols) {
      const res = await fetch(`${baseUrl}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      if (!res.ok) throw new Error("Quotes fetch failed");
      const json = (await res.json()) as { quotes: QuoteSnapshot[] };
      return json.quotes;
    },
    async getFundamentals(symbol) {
      const res = await fetch(
        `${baseUrl}/api/fundamentals?symbol=${encodeURIComponent(symbol)}`,
      );
      if (!res.ok) throw new Error("Fundamentals fetch failed");
      const json = (await res.json()) as { data: FundamentalsSnapshot };
      return json.data;
    },
  };
}
