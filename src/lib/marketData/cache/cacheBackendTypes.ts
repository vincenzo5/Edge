import type { CacheNamespace } from "./ttlPolicy";

/** Sync or async — memory backends return values; Redis backends return Promises. */
export type CacheMaybeAsync<T> = T | Promise<T>;

export type HotReadResult<T> = {
  hit: boolean;
  data: T | null;
  fresh: boolean;
  servable: boolean;
  asOf?: number;
  source?: string;
  warnings?: string[];
};

export type CacheReadResult<T> = {
  hit: boolean;
  value: T | null;
  stale: boolean;
  asOf?: number;
};

export interface HotStoreBackend {
  read<T>(key: string): CacheMaybeAsync<HotReadResult<T>>;
  write<T>(
    key: string,
    data: T,
    options: {
      source: string;
      freshMs: number;
      staleMs: number;
      asOf?: number;
      warnings?: string[];
    },
  ): CacheMaybeAsync<void>;
  clear(): CacheMaybeAsync<void>;
  invalidate(keys: string[]): CacheMaybeAsync<void>;
  invalidateDisplayDataCaches(): CacheMaybeAsync<void>;
  size(): CacheMaybeAsync<number>;
  approxTotalBytes(): CacheMaybeAsync<number>;
}

export interface DataCacheBackend {
  read<T>(namespace: CacheNamespace, key: string): CacheMaybeAsync<CacheReadResult<T>>;
  write<T>(
    namespace: CacheNamespace,
    key: string,
    value: T,
    ttlMs: number,
    asOf?: number,
  ): CacheMaybeAsync<void>;
  clear(namespace?: CacheNamespace): CacheMaybeAsync<void>;
  delete(namespace: CacheNamespace, key: string): CacheMaybeAsync<void>;
  size(namespace?: CacheNamespace): CacheMaybeAsync<number>;
  approxBytes(namespace?: CacheNamespace): CacheMaybeAsync<number>;
}

export type MarketDataCacheBackendKind = "memory" | "redis";

export function resolveMarketDataCacheBackendKind(): MarketDataCacheBackendKind {
  const raw = process.env.EDGE_MARKET_DATA_CACHE_BACKEND?.trim().toLowerCase();
  return raw === "redis" ? "redis" : "memory";
}

/** True when Redis is mandatory — boot throw if unavailable (Phase 1 shared-cache topology). */
export function isRedisRequired(): boolean {
  if (process.env.EDGE_REQUIRE_REDIS?.trim() === "1") {
    return true;
  }
  return process.env.NODE_ENV === "production";
}
