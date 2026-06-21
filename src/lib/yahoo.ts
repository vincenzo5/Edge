import "server-only";

import YahooFinance from "yahoo-finance2";

// v3 changed the default export from a singleton to a class that must be
// instantiated before use. See docs/UPGRADING.md (v2 -> v3).
const yahooFinance = new YahooFinance();

export type StockResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/**
 * Search Yahoo Finance for stocks (equities only). Returns at most `limit`
 * results, filtering out ETFs, mutual funds, indices, crypto, etc.
 */
export async function searchSymbols(
  query: string,
  limit = 8,
): Promise<StockResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const result = await yahooFinance.search(trimmed, {
    quotesCount: Math.max(limit * 2, 10),
    newsCount: 0,
  });

  const quotes = (result.quotes ?? []) as Array<Record<string, unknown>>;

  return quotes
    .filter((q) => q.quoteType === "EQUITY")
    .slice(0, limit)
    .map((q) => ({
      symbol: String(q.symbol ?? ""),
      name: String(q.shortname ?? q.longname ?? q.symbol ?? ""),
      exchange: String(q.exchange ?? ""),
    }))
    .filter((r) => r.symbol !== "");
}

/**
 * Fetch historical OHLCV candles for a symbol and map them to the shape
 * expected by KLineChart ({ timestamp, open, high, low, close, volume }).
 *
 * `range` is a human-friendly shorthand (e.g. "1y", "6mo", "1mo") translated
 * to a period1/period2 pair. `interval` is passed straight through to Yahoo
 * (e.g. "1d", "1wk", "1mo", "1h", "5m").
 */
export async function getChartCandles(
  symbol: string,
  range: Range = "1y",
  interval: Interval = "1d",
): Promise<Candle[]> {
  const { period1, period2 } = rangeToPeriods(range);
  return getChartCandlesInPeriod(symbol, period1, period2, interval);
}

/** Fetch candles for an explicit period window (used for edge prefetch). */
export async function getChartCandlesInPeriod(
  symbol: string,
  period1: Date,
  period2: Date,
  interval: Interval = "1d",
): Promise<Candle[]> {
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval,
  });

  const quotes = result.quotes ?? [];
  const candles: Candle[] = [];

  for (const q of quotes) {
    if (q.open == null || q.high == null || q.low == null || q.close == null) {
      continue;
    }
    candles.push({
      timestamp: Math.floor(q.date.getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? undefined,
    });
  }

  return candles;
}

/** Fetch older candles ending just before `beforeTimestampMs`. */
export async function getChartCandlesBefore(
  symbol: string,
  beforeTimestampMs: number,
  interval: Interval = "1d",
  barCount = 200,
): Promise<Candle[]> {
  const intervalMs = intervalToMs(interval);
  const period2 = new Date(beforeTimestampMs - intervalMs);
  const period1 = new Date(period2.getTime() - barCount * intervalMs);
  return getChartCandlesInPeriod(symbol, period1, period2, interval);
}

export function intervalToMs(interval: Interval): number {
  switch (interval) {
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "1wk":
      return 7 * 24 * 60 * 60 * 1000;
    case "1mo":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "ytd" | "max";
export type Interval = "1d" | "1wk" | "1mo" | "1h" | "5m" | "15m" | "30m";

const RANGE_DAYS: Record<Range, number | null> = {
  "1d": 1,
  "5d": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "2y": 730,
  "5y": 1825,
  ytd: null, // computed at runtime
  max: null, // 20 years back
};

function rangeToPeriods(range: Range): { period1: Date; period2: Date } {
  const period2 = new Date();
  let period1: Date;

  if (range === "ytd") {
    period1 = new Date(period2.getFullYear(), 0, 1);
  } else if (range === "max") {
    period1 = new Date(period2.getFullYear() - 20, 0, 1);
  } else {
    const days = RANGE_DAYS[range] ?? 365;
    period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return { period1, period2 };
}
