/** Max entries retained in the shared session cache (LRU by asOf). */
export const CLIENT_TTL_CACHE_DEFAULT_MAX_ENTRIES = 64;

type CacheEntry<T> = {
  value: T;
  asOf: number;
  ttlMs: number;
};

function cloneValue<V>(value: V): V {
  // Small mutable TTL payloads only — large Candle[] use chartClientCache immutable snapshots.
  if (value === null || typeof value !== "object") return value;
  return structuredClone(value);
}

/**
 * In-memory TTL + LRU cache for client-side market-data reads.
 * Memory-only — no sessionStorage/localStorage. Candles use `chartClientCache` instead.
 */
export class ClientTtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries = CLIENT_TTL_CACHE_DEFAULT_MAX_ENTRIES,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.now() - entry.asOf > entry.ttlMs) {
      this.store.delete(key);
      return undefined;
    }

    return cloneValue(entry.value);
  }

  set(key: string, value: T, ttlMs: number): void {
    const cloned = cloneValue(value);
    this.store.set(key, { value: cloned, asOf: this.now(), ttlMs });
    this.evictOldestIfNeeded();
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private evictOldestIfNeeded(): void {
    while (this.store.size > this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestAsOf = Infinity;
      for (const [key, entry] of this.store) {
        if (entry.asOf < oldestAsOf) {
          oldestAsOf = entry.asOf;
          oldestKey = key;
        }
      }
      if (oldestKey == null) break;
      this.store.delete(oldestKey);
    }
  }
}

let sharedCache: ClientTtlCache<unknown> | null = null;

/** Process/session singleton for Phase 1 consumers (search, fundamentals, overlays, context). */
export function getSharedClientTtlCache(): ClientTtlCache<unknown> {
  if (!sharedCache) {
    sharedCache = new ClientTtlCache<unknown>();
  }
  return sharedCache;
}

/** Clear shared cache (logout hook / tests). */
export function clearSharedClientTtlCache(): void {
  sharedCache?.clear();
}

/** Test helper — reset singleton between Vitest cases. */
export function clearSharedClientTtlCacheForTests(): void {
  sharedCache?.clear();
  sharedCache = null;
}
