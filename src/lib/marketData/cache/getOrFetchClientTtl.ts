import type { ClientCacheNamespace } from "./clientCachePolicy";
import { CLIENT_CACHE_TTL_MS } from "./clientCachePolicy";
import { getSharedClientTtlCache } from "./clientTtlCache";

const inFlight = new Map<string, Promise<unknown>>();

function coalesceClientTtlFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fn().finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, promise);
  return promise;
}

/** Reset in-flight coalesce map (tests). */
export function resetClientTtlFetchCoalesceForTests(): void {
  inFlight.clear();
}

/**
 * Session TTL cache read-through: hit → return; miss → coalesce fetch → set.
 * Memory-only; mirrors server TTL via `CLIENT_CACHE_TTL_MS`.
 */
export async function getOrFetchClientTtl<T>(
  namespace: ClientCacheNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  options?: { ttlMs?: number },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? CLIENT_CACHE_TTL_MS[namespace];
  const cache = getSharedClientTtlCache();
  const hit = cache.get(key) as T | undefined;
  if (hit !== undefined) return hit;

  return coalesceClientTtlFetch(key, async () => {
    const again = cache.get(key) as T | undefined;
    if (again !== undefined) return again;

    const value = await fetchFn();
    cache.set(key, value, ttlMs);
    return value;
  });
}
