import type { CacheNamespace } from "./ttlPolicy";

/** Max entries per DataCache namespace (Phase 0 frozen). */
export const DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE = 256;

/** Max entries in process-local HotStore (Phase 0 frozen). */
export const HOT_STORE_MAX_ENTRIES = 128;

/** Max entries in IBKR contract resolution cache. */
export const CONTRACT_CACHE_MAX_ENTRIES = 512;

/** Soft byte budget for large candle/universe namespaces. */
export const DATA_CACHE_SOFT_BYTE_BUDGET_LARGE_NS = 48 * 1024 * 1024;

/** Soft byte budget for other DataCache namespaces. */
export const DATA_CACHE_SOFT_BYTE_BUDGET_DEFAULT_NS = 8 * 1024 * 1024;

/** Soft byte budget for HotStore (global). */
export const HOT_STORE_SOFT_BYTE_BUDGET = 32 * 1024 * 1024;

const LARGE_BYTE_BUDGET_NAMESPACES = new Set<CacheNamespace>(["candles", "universe_daily"]);

export function dataCacheSoftByteBudget(namespace: CacheNamespace): number {
  return LARGE_BYTE_BUDGET_NAMESPACES.has(namespace)
    ? DATA_CACHE_SOFT_BYTE_BUDGET_LARGE_NS
    : DATA_CACHE_SOFT_BYTE_BUDGET_DEFAULT_NS;
}
