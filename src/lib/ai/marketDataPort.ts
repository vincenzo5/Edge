import type { Interval as ChartInterval } from "@/lib/chart/contracts";
import type { Candle, Range } from "@/lib/yahoo";
import type { FundamentalsSnapshot, QuoteSnapshot } from "@/lib/watchlist/types";
import type { MarketDataService } from "@/lib/marketData/service/marketDataService";
import type {
  OptionExpiration,
  OptionsChainResponse,
} from "@/lib/marketData/contracts/options";

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
  getOptionExpirations: (underlying: string) => Promise<OptionExpiration[]>;
  getOptionsChain: (
    underlying: string,
    expiration: string,
  ) => Promise<OptionsChainResponse>;
};

/** Server-side port backed by MarketDataService. */
export function createServiceMarketDataPort(service: MarketDataService): MarketDataPort {
  return {
    async searchSymbols(query, limit = 8) {
      const result = await service.searchInstruments(query, limit);
      return result.data.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        exchange: row.exchange ?? "",
      }));
    },
    async getCandles({ symbol, range, interval, before, barCount }) {
      const result = await service.getLegacyCandles({
        symbol,
        range,
        interval,
        beforeTimestamp: before,
        barCount,
      });
      return result.data as Candle[];
    },
    async getQuotes(symbols) {
      const result = await service.getWatchlistQuotes(symbols);
      return result.data;
    },
    async getFundamentals(symbol) {
      const result = await service.getWatchlistFundamentals(symbol);
      return result.data;
    },
    async getOptionExpirations(underlying) {
      const result = await service.getOptionExpirations(underlying);
      return result.data;
    },
    async getOptionsChain(underlying, expiration) {
      const result = await service.getOptionsChain({
        underlying,
        expiration,
        strikeWindow: { mode: "full" },
      });
      return result.data;
    },
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
      return (await res.json()) as FundamentalsSnapshot;
    },
    async getOptionExpirations(underlying) {
      const params = new URLSearchParams({ underlying });
      const res = await fetch(`${baseUrl}/api/options/expirations?${params.toString()}`);
      if (!res.ok) throw new Error("Options expirations fetch failed");
      const json = (await res.json()) as { expirations: OptionExpiration[] };
      return json.expirations;
    },
    async getOptionsChain(underlying, expiration) {
      const params = new URLSearchParams({ underlying, expiration });
      const res = await fetch(`${baseUrl}/api/options/chain?${params.toString()}`);
      if (!res.ok) throw new Error("Options chain fetch failed");
      const json = (await res.json()) as { chain: OptionsChainResponse };
      return json.chain;
    },
  };
}
