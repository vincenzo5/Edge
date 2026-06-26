import type { Interval as ChartInterval } from "@/lib/chart/contracts";
import type { Interval as YahooInterval, Range as YahooRange } from "@/lib/yahooFinance";
import type { EquityCandle, EquityQuote } from "../../contracts/equities";
import type { FundamentalsSnapshot } from "../../contracts/fundamentals";
import type { InstrumentSearchResult } from "../../contracts/instruments";
import { toTimestampMs, asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

export function mapYahooInterval(interval: ChartInterval): YahooInterval {
  if (interval === "2h") return "1h";
  return interval as YahooInterval;
}

export function mapYahooCandles(
  raw: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>,
): EquityCandle[] {
  return raw.map((c) => ({
    t: toTimestampMs(c.timestamp) ?? 0,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
  }));
}

export function mapYahooSearchResults(
  results: Array<{ symbol: string; name: string; exchange: string }>,
): InstrumentSearchResult[] {
  return results.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    assetType: "equity",
  }));
}

export function mapYahooQuotes(
  quotes: Array<{
    symbol: string;
    shortName?: string;
    exchange?: string;
    currency?: string;
    regularMarketPrice: number | null;
    regularMarketChange: number | null;
    regularMarketChangePercent: number | null;
    regularMarketVolume: number | null;
    marketState?: string;
    updatedAt: number;
  }>,
): EquityQuote[] {
  return quotes.map((q) => ({
    symbol: q.symbol,
    shortName: q.shortName,
    exchange: q.exchange,
    currency: q.currency,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    marketState: q.marketState,
    updatedAt: q.updatedAt,
  }));
}

export function mapYahooFundamentals(snapshot: {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  exchange: string | null;
  currency: string | null;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  averageVolume: number | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  updatedAt: number;
}): FundamentalsSnapshot {
  return { ...snapshot };
}

export type YahooFinanceClient = {
  searchSymbols(query: string, limit?: number): Promise<
    Array<{ symbol: string; name: string; exchange: string }>
  >;
  getChartCandles(
    symbol: string,
    range: YahooRange,
    interval: YahooInterval,
  ): Promise<
    Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    }>
  >;
  getChartCandlesBefore(
    symbol: string,
    beforeTimestampMs: number,
    interval?: YahooInterval,
    barCount?: number,
  ): Promise<
    Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    }>
  >;
  getQuoteSnapshots(symbols: string[]): Promise<
    Array<{
      symbol: string;
      shortName?: string;
      exchange?: string;
      currency?: string;
      regularMarketPrice: number | null;
      regularMarketChange: number | null;
      regularMarketChangePercent: number | null;
      regularMarketVolume: number | null;
      marketState?: string;
      updatedAt: number;
    }>
  >;
  getFundamentalsSnapshot(symbol: string): Promise<FundamentalsSnapshot>;
};

export function createYahooProvider(client: YahooFinanceClient) {
  return {
    async searchInstruments(query: string, limit = 8): Promise<InstrumentSearchResult[]> {
      const results = await client.searchSymbols(query, limit);
      return mapYahooSearchResults(results);
    },

    async getCandles(request: {
      symbol: string;
      range?: YahooRange;
      interval: ChartInterval;
      beforeTimestamp?: number;
      barCount?: number;
    }) {
      const yahooInterval = mapYahooInterval(request.interval);
      const raw =
        request.beforeTimestamp != null
          ? await client.getChartCandlesBefore(
              request.symbol,
              request.beforeTimestamp,
              yahooInterval,
              request.barCount ?? 200,
            )
          : await client.getChartCandles(
              request.symbol,
              request.range ?? "1y",
              yahooInterval,
            );
      const candles = mapYahooCandles(raw);
      return {
        symbol: request.symbol,
        interval: request.interval,
        candles,
        hasMore: request.beforeTimestamp != null ? candles.length > 0 : undefined,
        nextBeforeTimestamp:
          candles.length > 0 ? candles[0]!.t : undefined,
      };
    },

    async getQuotes(symbols: string[]): Promise<EquityQuote[]> {
      const quotes = await client.getQuoteSnapshots(symbols);
      return mapYahooQuotes(quotes);
    },

    async getFundamentals(symbol: string): Promise<FundamentalsSnapshot> {
      const snapshot = await client.getFundamentalsSnapshot(symbol);
      return mapYahooFundamentals(snapshot);
    },
  };
}

export function mapRawTradierOption(
  raw: Record<string, unknown>,
  underlying: string,
  expiration: string,
): import("../../contracts/options").OptionContractSnapshot | null {
  const optionType = asNonEmptyString(raw.option_type)?.toLowerCase();
  const type =
    optionType === "call" || optionType === "put"
      ? optionType
      : null;
  const strike = asFiniteNumber(raw.strike);
  const contractSymbol =
    asNonEmptyString(raw.symbol) ??
    asNonEmptyString(raw.option_symbol);
  if (!type || strike == null || !contractSymbol) return null;

  const bid = asFiniteNumber(raw.bid);
  const ask = asFiniteNumber(raw.ask);
  const mark =
    bid != null && ask != null ? (bid + ask) / 2 : asFiniteNumber(raw.last);
  const greeks =
    raw.greeks && typeof raw.greeks === "object"
      ? (raw.greeks as Record<string, unknown>)
      : undefined;

  return {
    contractSymbol,
    underlying,
    type,
    expiration,
    strike,
    bid,
    ask,
    last: asFiniteNumber(raw.last),
    mark,
    volume: asFiniteNumber(raw.volume),
    openInterest: asFiniteNumber(raw.open_interest ?? raw.openInterest),
    impliedVolatility: asFiniteNumber(
      greeks?.mid_iv ?? greeks?.smv_vol ?? raw.implied_volatility,
    ),
    delta: asFiniteNumber(greeks?.delta),
    gamma: asFiniteNumber(greeks?.gamma),
    theta: asFiniteNumber(greeks?.theta),
    vega: asFiniteNumber(greeks?.vega),
    rho: asFiniteNumber(greeks?.rho),
    updatedAt: Date.now(),
  };
}
