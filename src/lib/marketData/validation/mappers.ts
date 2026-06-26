import type { Interval } from "@/lib/chart/contracts";
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

export function fundamentalsToWatchlist(
  snapshot: FundamentalsSnapshot,
): WatchlistFundamentals {
  return { ...snapshot };
}

export function isIntradayInterval(interval: Interval): boolean {
  return ["1m", "5m", "15m", "30m", "1h", "2h"].includes(interval);
}
