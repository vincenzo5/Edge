import {
  DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE,
  dataCacheSoftByteBudget,
} from "./cacheBudgets";
import type { DataCacheBackend, CacheReadResult } from "./cacheBackendTypes";
import { evictMapUntilWithinBudget } from "./cacheEviction";
import { approxPayloadBytes, prepareServerSnapshot } from "./immutableSnapshot";
import type { CacheNamespace } from "./ttlPolicy";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  asOf?: number;
  touchedAt: number;
  approxBytes: number;
};

export type { CacheReadResult } from "./cacheBackendTypes";

export type DataCacheOptions = {
  maxEntriesPerNamespace?: number;
  softByteBudget?: (namespace: CacheNamespace) => number;
};

export class DataCache implements DataCacheBackend {
  private stores = new Map<CacheNamespace, Map<string, CacheEntry<unknown>>>();

  constructor(private readonly options: DataCacheOptions = {}) {}

  private store(namespace: CacheNamespace): Map<string, CacheEntry<unknown>> {
    let s = this.stores.get(namespace);
    if (!s) {
      s = new Map();
      this.stores.set(namespace, s);
    }
    return s;
  }

  read<T>(namespace: CacheNamespace, key: string): CacheReadResult<T> {
    const ns = this.store(namespace);
    const entry = ns.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return { hit: false, value: null, stale: false };
    }
    const now = Date.now();
    if (entry.expiresAt <= now) {
      ns.delete(key);
      return { hit: false, value: null, stale: true, asOf: entry.asOf };
    }
    entry.touchedAt = now;
    return {
      hit: true,
      value: entry.value,
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
    const now = Date.now();
    const stored = prepareServerSnapshot(value);
    const ns = this.store(namespace);
    ns.set(key, {
      value: stored,
      expiresAt: now + ttlMs,
      asOf,
      touchedAt: now,
      approxBytes: approxPayloadBytes(stored),
    });
    this.evictNamespace(namespace);
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

  /** Test/diagnostics: entry count for one namespace or all namespaces. */
  size(namespace?: CacheNamespace): number {
    if (namespace) {
      return this.store(namespace).size;
    }
    let total = 0;
    for (const ns of this.stores.values()) {
      total += ns.size;
    }
    return total;
  }

  /** Test/diagnostics: approximate retained bytes for one namespace or all. */
  approxBytes(namespace?: CacheNamespace): number {
    if (namespace) {
      let sum = 0;
      for (const entry of this.store(namespace).values()) {
        sum += entry.approxBytes;
      }
      return sum;
    }
    let total = 0;
    for (const ns of this.stores.values()) {
      for (const entry of ns.values()) {
        total += entry.approxBytes;
      }
    }
    return total;
  }

  private evictNamespace(namespace: CacheNamespace): void {
    evictMapUntilWithinBudget(this.store(namespace), {
      maxEntries:
        this.options.maxEntriesPerNamespace ?? DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE,
      softBytes:
        this.options.softByteBudget?.(namespace) ?? dataCacheSoftByteBudget(namespace),
    });
  }
}

export function buildCacheKey(parts: Array<string | number | undefined | null>): string {
  return parts
    .map((part) => (part == null ? "" : String(part)))
    .join("|");
}
