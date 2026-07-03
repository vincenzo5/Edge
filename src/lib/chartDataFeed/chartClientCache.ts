import type { Candle, ChartDataMeta, Interval, MarketSessionMode, Range } from '@edge/chart-core';

export type ChartClientCacheEntry = {
  candles: Candle[];
  meta: ChartDataMeta;
  hasMore: boolean;
  asOf: number;
};

export type ChartClientCacheKeyParts = {
  symbol: string;
  exchange?: string;
  interval: Interval;
  range: Range;
  sessionMode?: MarketSessionMode;
};

/** Max entries retained in the session cache (LRU by asOf). */
export const CHART_CLIENT_CACHE_MAX_ENTRIES = 20;

/** Max age before a cached entry is treated as a miss (matches server HOT_STALE_MS.candles). */
export const CHART_CLIENT_CACHE_MAX_AGE_MS = 5 * 60_000;

const store = new Map<string, ChartClientCacheEntry>();

export function buildChartClientCacheKey(parts: ChartClientCacheKeyParts): string {
  return [
    parts.symbol,
    parts.exchange ?? '',
    parts.interval,
    parts.range ?? '',
    parts.sessionMode ?? 'regular',
  ].join('|');
}

export function readChartClientCache(key: string): ChartClientCacheEntry | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.asOf > CHART_CLIENT_CACHE_MAX_AGE_MS) {
    store.delete(key);
    return null;
  }
  return {
    candles: structuredClone(entry.candles),
    meta: structuredClone(entry.meta),
    hasMore: entry.hasMore,
    asOf: entry.asOf,
  };
}

export function writeChartClientCache(key: string, entry: ChartClientCacheEntry): void {
  store.set(key, {
    candles: structuredClone(entry.candles),
    meta: structuredClone(entry.meta),
    hasMore: entry.hasMore,
    asOf: entry.asOf,
  });
  evictOldestIfNeeded();
}

function evictOldestIfNeeded(): void {
  while (store.size > CHART_CLIENT_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestAsOf = Infinity;
    for (const [key, entry] of store) {
      if (entry.asOf < oldestAsOf) {
        oldestAsOf = entry.asOf;
        oldestKey = key;
      }
    }
    if (oldestKey == null) break;
    store.delete(oldestKey);
  }
}

export function clearChartClientCache(): void {
  store.clear();
}

/** Test helper to reset session cache between Vitest cases. */
export function clearChartClientCacheForTests(): void {
  clearChartClientCache();
}
