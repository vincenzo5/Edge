import type { Interval } from "@/lib/chart/contracts";

export type CacheNamespace =
  | "candles"
  | "quotes"
  | "fundamentals"
  | "search"
  | "options_expirations"
  | "options_chain"
  | "events"
  | "news"
  | "macro"
  | "sec"
  | "fmp_profile"
  | "fmp_estimates"
  | "fmp_financials"
  | "fmp_executives"
  | "fmp_filings"
  | "fmp_movers";

const INTRADAY_INTERVALS = new Set<Interval>(["1m", "5m", "15m", "30m", "1h", "2h"]);

export function candleCacheTtlMs(interval: Interval): number {
  return INTRADAY_INTERVALS.has(interval) ? 30_000 : 60_000;
}

export const CACHE_TTL_MS: Record<Exclude<CacheNamespace, "candles">, number> = {
  quotes: 30_000,
  fundamentals: 6 * 60 * 60 * 1000,
  search: 60_000,
  options_expirations: 60_000,
  options_chain: 30_000,
  events: 15 * 60 * 1000,
  news: 5 * 60 * 1000,
  macro: 60 * 60 * 1000,
  sec: 6 * 60 * 60 * 1000,
  fmp_profile: 6 * 60 * 60 * 1000,
  fmp_estimates: 6 * 60 * 60 * 1000,
  fmp_financials: 6 * 60 * 60 * 1000,
  fmp_executives: 24 * 60 * 60 * 1000,
  fmp_filings: 6 * 60 * 60 * 1000,
  fmp_movers: 60_000,
};

export function cacheTtlMs(namespace: CacheNamespace, interval?: Interval): number {
  if (namespace === "candles") {
    return candleCacheTtlMs(interval ?? "1d");
  }
  return CACHE_TTL_MS[namespace];
}
