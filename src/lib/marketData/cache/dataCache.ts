import type { CacheNamespace } from "./ttlPolicy";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  asOf?: number;
};

export type CacheReadResult<T> = {
  hit: boolean;
  value: T | null;
  stale: boolean;
  asOf?: number;
};

export class DataCache {
  private stores = new Map<CacheNamespace, Map<string, CacheEntry<unknown>>>();

  private store(namespace: CacheNamespace): Map<string, CacheEntry<unknown>> {
    let s = this.stores.get(namespace);
    if (!s) {
      s = new Map();
      this.stores.set(namespace, s);
    }
    return s;
  }

  read<T>(namespace: CacheNamespace, key: string): CacheReadResult<T> {
    const entry = this.store(namespace).get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return { hit: false, value: null, stale: false };
    }
    if (entry.expiresAt <= Date.now()) {
      this.store(namespace).delete(key);
      return { hit: false, value: null, stale: true, asOf: entry.asOf };
    }
    return {
      hit: true,
      value: structuredClone(entry.value),
      stale: false,
      asOf: entry.asOf,
    };
  }

  write<T>(
    namespace: CacheNamespace,
    key: string,
    value: T,
    ttlMs: number,
    asOf?: number,
  ): void {
    this.store(namespace).set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttlMs,
      asOf,
    });
  }

  clear(namespace?: CacheNamespace): void {
    if (namespace) {
      this.store(namespace).clear();
      return;
    }
    this.stores.clear();
  }

  delete(namespace: CacheNamespace, key: string): void {
    this.store(namespace).delete(key);
  }
}

/** Process-local singleton used by MarketDataService. */
export const globalDataCache = new DataCache();

/** Test helper to reset all cached market data. */
export function clearMarketDataCacheForTests(): void {
  globalDataCache.clear();
}

export function buildCacheKey(parts: Array<string | number | undefined | null>): string {
  return parts
    .map((part) => (part == null ? "" : String(part)))
    .join("|");
}
