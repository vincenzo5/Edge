import type { CacheNamespace } from "./ttlPolicy";

/** Bump on incompatible HotStore/DataCache Redis payload shape; no dual-read migration. */
export const REDIS_MD_SCHEMA_VERSION = 1;

function sanitizeCacheEnvSegment(raw: string): string {
  const sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "dev";
}

/** Deploy env segment for Redis key isolation (`EDGE_CACHE_ENV` overrides `NODE_ENV`). */
export function resolveRedisCacheEnv(): string {
  const explicit = process.env.EDGE_CACHE_ENV?.trim();
  if (explicit) {
    return sanitizeCacheEnvSegment(explicit);
  }
  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv === "production") return "prod";
  if (nodeEnv === "development") return "dev";
  if (nodeEnv === "test") return "test";
  if (nodeEnv) return sanitizeCacheEnvSegment(nodeEnv);
  return "dev";
}

export function redisMdKeyRoot(): string {
  return `edge:${resolveRedisCacheEnv()}:${REDIS_MD_SCHEMA_VERSION}:md`;
}

export function redisHotEntryPrefix(): string {
  return `${redisMdKeyRoot()}:hot:entry:`;
}

export function redisHotLruKey(): string {
  return `${redisMdKeyRoot()}:hot:lru`;
}

export function redisDcEntryPrefix(): string {
  return `${redisMdKeyRoot()}:dc:entry:`;
}

export function redisDcLruPrefix(): string {
  return `${redisMdKeyRoot()}:dc:lru:`;
}

export function redisDcLruScanPattern(): string {
  return `${redisDcLruPrefix()}*`;
}

export function redisHotEntryKey(logicalKey: string): string {
  return `${redisHotEntryPrefix()}${logicalKey}`;
}

export function redisDataCacheEntryKey(namespace: CacheNamespace, logicalKey: string): string {
  return `${redisDcEntryPrefix()}${namespace}:${logicalKey}`;
}

export function redisDataCacheLruKey(namespace: CacheNamespace): string {
  return `${redisDcLruPrefix()}${namespace}`;
}

export function dataCacheNamespaceFromLruKey(lruKey: string): CacheNamespace | null {
  const prefix = redisDcLruPrefix();
  if (!lruKey.startsWith(prefix)) return null;
  const ns = lruKey.slice(prefix.length);
  return ns.length > 0 ? (ns as CacheNamespace) : null;
}

export function isDisplayHotLogicalKey(logicalKey: string): boolean {
  return (
    logicalKey.startsWith("hot|quote|") ||
    logicalKey.startsWith("hot|candles|") ||
    logicalKey.startsWith("hot|options-exp|") ||
    logicalKey.startsWith("hot|options-chain|")
  );
}
