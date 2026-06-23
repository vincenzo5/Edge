import YahooFinance from "yahoo-finance2";

import type { Interval as ChartInterval } from "./chart/contracts";

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

export type QuoteSnapshot = {
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
};

export type FundamentalsSnapshot = {
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
};

export type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "ytd" | "max";
export type Interval = "1m" | "1d" | "1wk" | "1mo" | "1h" | "5m" | "15m" | "30m";

const RANGE_DAYS: Record<Range, number | null> = {
  "1d": 1,
  "5d": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "2y": 730,
  "5y": 1825,
  ytd: null,
  max: null,
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

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

/** Batch quote snapshots for watchlist rows. */
export async function getQuoteSnapshots(symbols: string[]): Promise<QuoteSnapshot[]> {
  const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) return [];

  const raw = await yahooFinance.quote(normalized);
  const quotes = Array.isArray(raw) ? raw : [raw];
  const now = Date.now();
  const results: QuoteSnapshot[] = [];

  for (const q of quotes) {
    const record = q as Record<string, unknown>;
    const symbol = asString(record.symbol) ?? "";
    if (!symbol) continue;
    results.push({
      symbol,
      shortName: asString(record.shortName) ?? asString(record.longName) ?? undefined,
      exchange: asString(record.fullExchangeName) ?? asString(record.exchange) ?? undefined,
      currency: asString(record.currency) ?? undefined,
      regularMarketPrice: asNumber(record.regularMarketPrice),
      regularMarketChange: asNumber(record.regularMarketChange),
      regularMarketChangePercent: asNumber(record.regularMarketChangePercent),
      regularMarketVolume: asNumber(record.regularMarketVolume),
      marketState: asString(record.marketState) ?? undefined,
      updatedAt: now,
    });
  }

  return results;
}

/** Fundamentals snapshot for the watchlist details panel. */
export async function getFundamentalsSnapshot(symbol: string): Promise<FundamentalsSnapshot> {
  const sym = symbol.trim().toUpperCase();
  const result = await yahooFinance.quoteSummary(sym, {
    modules: ["price", "summaryDetail", "summaryProfile", "assetProfile"],
  });

  const record = result as Record<string, unknown>;
  const price = (record.price as Record<string, unknown> | undefined) ?? {};
  const summaryDetail = (record.summaryDetail as Record<string, unknown> | undefined) ?? {};
  const summaryProfile = (record.summaryProfile as Record<string, unknown> | undefined) ?? {};
  const assetProfile = (record.assetProfile as Record<string, unknown> | undefined) ?? {};
  const now = Date.now();

  return {
    symbol: asString(price.symbol) ?? sym,
    shortName: asString(price.shortName),
    longName: asString(price.longName),
    exchange: asString(price.exchangeName) ?? asString(price.exchange),
    currency: asString(price.currency),
    regularMarketPrice: asNumber(price.regularMarketPrice),
    regularMarketChange: asNumber(price.regularMarketChange),
    regularMarketChangePercent: asNumber(price.regularMarketChangePercent),
    marketCap: asNumber(summaryDetail.marketCap),
    volume: asNumber(summaryDetail.volume) ?? asNumber(price.regularMarketVolume),
    averageVolume: asNumber(summaryDetail.averageVolume),
    sector: asString(assetProfile.sector) ?? asString(summaryProfile.sector),
    industry: asString(assetProfile.industry) ?? asString(summaryProfile.industry),
    website: asString(assetProfile.website) ?? asString(summaryProfile.website),
    description: asString(assetProfile.longBusinessSummary),
    updatedAt: now,
  };
}

/** Normalize and cap symbol list for API routes. */
export function normalizeSymbolList(symbols: unknown, max = 50): string[] {
  if (!Array.isArray(symbols)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of symbols) {
    if (typeof raw !== "string") continue;
    const sym = raw.trim().toUpperCase();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
    if (out.length >= max) break;
  }
  return out;
}

export function intervalToMs(interval: ChartInterval): number {
  switch (interval) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "2h":
      return 2 * 60 * 60 * 1000;
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
