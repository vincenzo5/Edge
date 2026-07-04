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

export const CHART_CLIENT_SESSION_STORAGE_PREFIX = 'edge:chart-cache:v1:';

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

function cloneEntry(entry: ChartClientCacheEntry): ChartClientCacheEntry {
  return {
    candles: structuredClone(entry.candles),
    meta: structuredClone(entry.meta),
    hasMore: entry.hasMore,
    asOf: entry.asOf,
  };
}

function isEntryFresh(entry: ChartClientCacheEntry): boolean {
  return Date.now() - entry.asOf <= CHART_CLIENT_CACHE_MAX_AGE_MS;
}

function sessionStorageKey(key: string): string {
  return `${CHART_CLIENT_SESSION_STORAGE_PREFIX}${key}`;
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
      return cloneEntry(memory);
    }
  }

  const fromSession = readSessionStorageEntry(key);
  if (!fromSession) return null;

  store.set(key, cloneEntry(fromSession));
  return cloneEntry(fromSession);
}

export function writeChartClientCache(key: string, entry: ChartClientCacheEntry): void {
  const cloned = cloneEntry(entry);
  store.set(key, cloned);
  writeSessionStorageEntry(key, cloned);
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
