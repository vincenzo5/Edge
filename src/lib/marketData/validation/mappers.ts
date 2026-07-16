import type { Interval } from "@/lib/chart/contracts";
import type { MarketQuote } from "@edge/chart-core";
import type { EquityCandle, EquityQuote } from "../contracts/equities";
import type { FundamentalsSnapshot } from "../contracts/fundamentals";
import type { QuoteSnapshot, FundamentalsSnapshot as WatchlistFundamentals } from "@/lib/watchlist/types";

/** Map normalized equity candle to legacy Yahoo API shape (seconds). */
export function equityCandleToLegacyApi(candle: EquityCandle): {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
} {
  return {
    timestamp: Math.floor(candle.t / 1000),
    open: candle.o,
    high: candle.h,
    low: candle.l,
    close: candle.c,
    volume: candle.v,
  };
}

export function equityQuoteToWatchlistQuote(quote: EquityQuote): QuoteSnapshot {
  return {
    symbol: quote.symbol,
    shortName: quote.shortName,
    exchange: quote.exchange,
    currency: quote.currency,
    regularMarketPrice: quote.price,
    regularMarketChange: quote.change,
    regularMarketChangePercent: quote.changePercent,
    regularMarketVolume: quote.volume,
    marketState: quote.marketState,
    updatedAt: quote.updatedAt,
  };
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Map a quote SSE/REST row into QuoteSnapshot.
 * Accepts both MarketQuote (`price`/`changePercent`) and Yahoo-style (`regularMarket*`) keys.
 */
export function mapRawQuoteToSnapshot(raw: Record<string, unknown>): QuoteSnapshot | null {
  const symbol = typeof raw.symbol === "string" ? raw.symbol.trim().toUpperCase() : "";
  if (!symbol) return null;
  return {
    symbol,
    shortName: typeof raw.shortName === "string" ? raw.shortName : undefined,
    exchange: typeof raw.exchange === "string" ? raw.exchange : undefined,
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
    regularMarketPrice:
      asFiniteNumber(raw.regularMarketPrice) ?? asFiniteNumber(raw.price),
    regularMarketChange:
      asFiniteNumber(raw.regularMarketChange) ?? asFiniteNumber(raw.change),
    regularMarketChangePercent:
      asFiniteNumber(raw.regularMarketChangePercent) ?? asFiniteNumber(raw.changePercent),
    regularMarketVolume:
      asFiniteNumber(raw.regularMarketVolume) ?? asFiniteNumber(raw.volume),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export function equityQuoteToMarketQuote(quote: EquityQuote): MarketQuote {
  return {
    symbol: quote.symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    volume: quote.volume,
    currency: quote.currency,
    exchange: quote.exchange,
    shortName: quote.shortName,
    updatedAt: quote.updatedAt,
  };
}

export function quoteSnapshotToMarketQuote(quote: QuoteSnapshot): MarketQuote {
  return {
    symbol: quote.symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    volume: quote.regularMarketVolume,
    currency: quote.currency,
    exchange: quote.exchange,
    shortName: quote.shortName,
    updatedAt: quote.updatedAt,
  };
}

export function fundamentalsToWatchlist(
  snapshot: FundamentalsSnapshot,
): WatchlistFundamentals {
  return { ...snapshot };
}

export function isIntradayInterval(interval: Interval): boolean {
  return ["1m", "5m", "15m", "30m", "1h", "2h"].includes(interval);
}
