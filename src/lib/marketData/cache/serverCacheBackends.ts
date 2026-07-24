import "server-only";

import { HotStore } from "./memoryHotStore";
import { DataCache } from "./dataCache";
import type { DataCacheBackend, HotStoreBackend } from "./cacheBackendTypes";
import {
  isRedisRequired,
  resolveMarketDataCacheBackendKind,
} from "./cacheBackendTypes";
import {
  createRedisClient,
  getRedisUrl,
  markRedisConnectAttempted,
  pingRedis,
  resetSharedRedisClientForTests,
} from "./redisClient";
import { RedisDataCache } from "./redisDataCache";
import { RedisHotStore } from "./redisHotStore";
import {
  isServerCacheDegraded,
  markServerCacheDegraded,
  resetServerCacheDegradedForTests,
} from "./serverCacheDegraded";

export type ServerCacheBackends = {
  hotStore: HotStoreBackend;
  dataCache: DataCacheBackend;
  kind: "memory" | "redis";
};

let cachedBackends: ServerCacheBackends | null = null;
/** Ephemeral sync fallback when Redis is configured but not yet initialized — never cached. */
let ephemeralMemoryBackends: ServerCacheBackends | null = null;

function createMemoryBackends(): ServerCacheBackends {
  return {
    hotStore: new HotStore(),
    dataCache: new DataCache(),
    kind: "memory",
  };
}

function getEphemeralMemoryBackends(): ServerCacheBackends {
  if (!ephemeralMemoryBackends) {
    ephemeralMemoryBackends = createMemoryBackends();
  }
  return ephemeralMemoryBackends;
}

function redisUnavailableError(reason: "missing_url" | "ping_failed"): Error {
  const detail =
    reason === "missing_url"
      ? "REDIS_URL is unset"
      : "Redis ping failed";
  return new Error(
    `[market-data-cache] Redis is required (${detail}) — refusing to start with in-process memory fallback`,
  );
}

export async function createServerCacheBackends(): Promise<ServerCacheBackends> {
  if (resolveMarketDataCacheBackendKind() !== "redis") {
    return createMemoryBackends();
  }

  const url = getRedisUrl();
  if (!url) {
    if (isRedisRequired()) {
      throw redisUnavailableError("missing_url");
    }
    console.warn(
      "[market-data-cache] EDGE_MARKET_DATA_CACHE_BACKEND=redis but REDIS_URL is unset — using memory",
    );
    return createMemoryBackends();
  }

  markRedisConnectAttempted();
  const client = createRedisClient();
  const ok = await pingRedis(client);
  if (!ok) {
    await client.quit().catch(() => undefined);
    if (isRedisRequired()) {
      throw redisUnavailableError("ping_failed");
    }
    console.warn(
      "[market-data-cache] Redis ping failed — falling back to in-process HotStore/DataCache",
    );
    return createMemoryBackends();
  }

  return {
    hotStore: new RedisHotStore(client),
    dataCache: new RedisDataCache(client),
    kind: "redis",
  };
}

function ensureMemoryBackendsSync(): ServerCacheBackends {
  if (!cachedBackends) {
    cachedBackends = createMemoryBackends();
  }
  return cachedBackends;
}

/** Lazy singleton — memory by default; Redis selected only when env + ping succeed at first init. */
export function getServerCacheBackends(): ServerCacheBackends {
  if (cachedBackends) {
    return cachedBackends;
  }

  if (resolveMarketDataCacheBackendKind() === "redis") {
    // Defer Redis connect until async init; do not cache ephemeral memory for redis kind.
    return getEphemeralMemoryBackends();
  }

  return ensureMemoryBackendsSync();
}

/** Call during server boot when Redis backend is configured. */
export async function initializeServerCacheBackends(): Promise<ServerCacheBackends> {
  if (cachedBackends?.kind === "redis") {
    return cachedBackends;
  }
  if (resolveMarketDataCacheBackendKind() === "redis") {
    cachedBackends = await createServerCacheBackends();
    return cachedBackends;
  }
  cachedBackends = createMemoryBackends();
  return cachedBackends;
}

export const globalHotStore: HotStoreBackend = new Proxy({} as HotStoreBackend, {
  get(_target, prop, receiver) {
    const backend = getServerCacheBackends().hotStore;
    const value = Reflect.get(backend as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(backend);
    }
    return value;
  },
});

export const globalDataCache: DataCacheBackend = new Proxy({} as DataCacheBackend, {
  get(_target, prop, receiver) {
    const backend = getServerCacheBackends().dataCache;
    const value = Reflect.get(backend as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(backend);
    }
    return value;
  },
});

export { isServerCacheDegraded, markServerCacheDegraded } from "./serverCacheDegraded";

export function resetServerCacheBackendsForTests(): void {
  cachedBackends = null;
  ephemeralMemoryBackends = null;
  resetServerCacheDegradedForTests();
  initPromise = null;
  resetSharedRedisClientForTests();
}

export async function clearServerCachesForTests(): Promise<void> {
  const backends = getServerCacheBackends();
  await Promise.resolve(backends.hotStore.clear());
  await Promise.resolve(backends.dataCache.clear());
}

/** Sync test helper — clears active server cache backends. */
export function clearMarketDataCacheForTests(): void {
  void clearServerCachesForTests();
}

export function activeServerCacheBackendKind(): "memory" | "redis" {
  return getServerCacheBackends().kind;
}

let initPromise: Promise<ServerCacheBackends> | null = null;

/** Idempotent server boot hook (instrumentation + tests). */
export function ensureServerCacheBackendsInitialized(): Promise<ServerCacheBackends> {
  if (cachedBackends?.kind === "redis") {
    return Promise.resolve(cachedBackends);
  }
  if (resolveMarketDataCacheBackendKind() !== "redis" && cachedBackends) {
    return Promise.resolve(cachedBackends);
  }
  if (!initPromise) {
    initPromise = initializeServerCacheBackends().then((backends) => {
      cachedBackends = backends;
      return backends;
    });
  }
  return initPromise;
}
