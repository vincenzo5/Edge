import type { Candle, ChartDataMeta, ChartHistoryExtent, Interval, MarketSessionMode, Range } from '@edge/chart-core';
import { mergeCandlesPrepend, trimResidentBars } from '@edge/chart-core';

export type ChartClientCacheEntry = {
  candles: Candle[];
  meta: ChartDataMeta;
  hasMore: boolean;
  historyExtent?: ChartHistoryExtent | null;
  asOf: number;
};

export type ChartClientCacheKeyParts = {
  symbol: string;
  exchange?: string;
  interval: Interval;
  range?: Range;
  sessionMode?: MarketSessionMode;
};

/** Max entries retained in the session cache (LRU by asOf). */
export const CHART_CLIENT_CACHE_MAX_ENTRIES = 20;

/** Max age before a cached entry is treated as a miss (matches server HOT_STALE_MS.candles). */
export const CHART_CLIENT_CACHE_MAX_AGE_MS = 5 * 60_000;

export const CHART_CLIENT_SESSION_STORAGE_PREFIX = 'edge:chart-cache:v1:';

/** Skip sessionStorage persistence when series exceeds this bar count (Phase 0 frozen knob). */
export const CHART_CLIENT_SESSION_STORAGE_MAX_BARS = 2_000;

/** Skip sessionStorage persistence when serialized payload exceeds this size (Phase 0 frozen knob). */
export const CHART_CLIENT_SESSION_STORAGE_MAX_BYTES = 2_000_000;

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

function isFrozen(value: unknown): boolean {
  return Object.isFrozen(value);
}

/** Shallow-freeze each candle and the series array. Idempotent when already frozen. */
export function freezeCandleSeries(candles: Candle[]): Candle[] {
  if (candles.length === 0) {
    return Object.freeze(candles) as Candle[];
  }
  if (isFrozen(candles)) {
    return candles as Candle[];
  }
  for (const candle of candles) {
    if (!isFrozen(candle)) {
      Object.freeze(candle);
    }
  }
  return Object.freeze(candles) as Candle[];
}

function freezeMeta(meta: ChartDataMeta): ChartDataMeta {
  if (isFrozen(meta)) {
    return meta;
  }
  return Object.freeze({ ...meta });
}

function prepareCacheEntry(entry: ChartClientCacheEntry): ChartClientCacheEntry {
  return {
    candles: freezeCandleSeries(entry.candles),
    meta: freezeMeta(entry.meta),
    hasMore: entry.hasMore,
    historyExtent: entry.historyExtent ?? null,
    asOf: entry.asOf,
  };
}

/** Return a read-only view shell; candle/meta refs are shared with the store. */
function exposeCacheEntry(entry: ChartClientCacheEntry): ChartClientCacheEntry {
  return {
    candles: entry.candles,
    meta: entry.meta,
    hasMore: entry.hasMore,
    historyExtent: entry.historyExtent ?? null,
    asOf: entry.asOf,
  };
}

function isEntryFresh(entry: ChartClientCacheEntry): boolean {
  return Date.now() - entry.asOf <= CHART_CLIENT_CACHE_MAX_AGE_MS;
}

function sessionStorageKey(key: string): string {
  return `${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`;
}

function shouldPersistToSessionStorage(entry: ChartClientCacheEntry): boolean {
  if (entry.candles.length > CHART_CLIENT_SESSION_STORAGE_MAX_BARS) {
    return false;
  }
  try {
    const serialized = JSON.stringify(entry);
    return serialized.length <= CHART_CLIENT_SESSION_STORAGE_MAX_BYTES;
  } catch {
    return false;
  }
}

function readSessionStorageEntry(key: string): ChartClientCacheEntry | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(sessionStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChartClientCacheEntry;
    if (!isEntryFresh(parsed)) {
      window.sessionStorage.removeItem(sessionStorageKey(key));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionStorageEntry(key: string, entry: ChartClientCacheEntry): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  if (!shouldPersistToSessionStorage(entry)) {
    removeSessionStorageEntry(key);
    return;
  }
  try {
    window.sessionStorage.setItem(sessionStorageKey(key), JSON.stringify(entry));
  } catch {
    // Quota or private mode — memory cache still works.
  }
}

function removeSessionStorageEntry(key: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(sessionStorageKey(key));
  } catch {
    // ignore
  }
}

export function readChartClientCache(key: string): ChartClientCacheEntry | null {
  const memory = store.get(key);
  if (memory) {
    if (!isEntryFresh(memory)) {
      store.delete(key);
      removeSessionStorageEntry(key);
    } else {
      return exposeCacheEntry(memory);
    }
  }

  const fromSession = readSessionStorageEntry(key);
  if (!fromSession) return null;

  const prepared = prepareCacheEntry(fromSession);
  store.set(key, prepared);
  return exposeCacheEntry(prepared);
}

export function writeChartClientCache(key: string, entry: ChartClientCacheEntry): void {
  const { candles } = trimResidentBars(entry.candles);
  const prepared = prepareCacheEntry({ ...entry, candles });
  store.set(key, prepared);
  writeSessionStorageEntry(key, prepared);
  evictOldestIfNeeded();
}

export type WriteMergedChartClientCacheParams = {
  /** Newer right-edge snapshot (initial range or refreshed bars). */
  rightEdgeCandles: Candle[];
  /** Older bars to prepend (cached history or prepended pages). */
  leftHistoryCandles?: Candle[];
  meta: ChartDataMeta;
  hasMore: boolean;
  historyExtent?: ChartHistoryExtent | null;
  asOf: number;
};

/** Merge right-edge + left history then persist under one cache key. */
export function writeMergedChartClientCache(
  key: string,
  params: WriteMergedChartClientCacheParams,
): ChartClientCacheEntry {
  const merged =
    params.leftHistoryCandles && params.leftHistoryCandles.length > 0
      ? mergeCandlesPrepend(params.rightEdgeCandles, params.leftHistoryCandles)
      : params.rightEdgeCandles;
  writeChartClientCache(key, {
    candles: merged,
    meta: params.meta,
    hasMore: params.hasMore,
    historyExtent: params.historyExtent ?? null,
    asOf: params.asOf,
  });
  return readChartClientCache(key) ?? prepareCacheEntry({
    candles: merged,
    meta: params.meta,
    hasMore: params.hasMore,
    historyExtent: params.historyExtent ?? null,
    asOf: params.asOf,
  });
}

/** Update hasMore on an existing cache entry without replacing candles. */
export function patchChartClientCacheHasMore(key: string, hasMore: boolean): void {
  const existing = store.get(key);
  if (!existing || !isEntryFresh(existing)) return;
  writeChartClientCache(key, {
    candles: existing.candles,
    meta: existing.meta,
    hasMore,
    asOf: Date.now(),
  });
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
    removeSessionStorageEntry(oldestKey);
  }
}

export function clearChartClientCache(): void {
  for (const key of store.keys()) {
    removeSessionStorageEntry(key);
  }
  store.clear();
}

/** Test helper to reset session cache between Vitest cases. */
export function clearChartClientCacheForTests(): void {
  clearChartClientCache();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(CHART_CLIENT_SESSION_STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      window.sessionStorage.removeItem(key);
    }
  }
}
