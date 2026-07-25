import type Redis from "ioredis";
import {
  DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE,
  dataCacheSoftByteBudget,
} from "./cacheBudgets";
import type { DataCacheBackend } from "./cacheBackendTypes";
import type { CacheReadResult } from "./dataCache";
import { approxPayloadBytes, prepareServerSnapshot } from "./immutableSnapshot";
import { ensureRedisConnected } from "./redisClient";
import { markServerCacheDegraded } from "./serverCacheDegraded";
import {
  evictRedisUntilWithinBudget,
  removeRedisLruMembers,
  scanDeleteByPrefix,
} from "./redisEviction";
import {
  dataCacheNamespaceFromLruKey,
  redisDataCacheEntryKey,
  redisDataCacheLruKey,
  redisDcEntryPrefix,
  redisDcLruScanPattern,
} from "./redisKeys";
import type { CacheNamespace } from "./ttlPolicy";

export type RedisDataCacheEnvelope<T> = {
  value: T;
  expiresAt: number;
  asOf?: number;
  touchedAt: number;
  approxBytes: number;
};

export type RedisDataCacheOptions = {
  maxEntriesPerNamespace?: number;
  softByteBudget?: (namespace: CacheNamespace) => number;
};

export class RedisDataCache implements DataCacheBackend {
  constructor(
    private readonly redis: Redis,
    private readonly options: RedisDataCacheOptions = {},
  ) {}

  private maxEntries(namespace: CacheNamespace): number {
    return this.options.maxEntriesPerNamespace ?? DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE;
  }

  private softBytes(namespace: CacheNamespace): number {
    return this.options.softByteBudget?.(namespace) ?? dataCacheSoftByteBudget(namespace);
  }

  async read<T>(namespace: CacheNamespace, key: string): Promise<CacheReadResult<T>> {
    try {
      await ensureRedisConnected(this.redis);
      const redisKey = redisDataCacheEntryKey(namespace, key);
      const raw = await this.redis.get(redisKey);
      if (!raw) {
        return { hit: false, value: null, stale: false };
      }

      let entry: RedisDataCacheEnvelope<T>;
      try {
        entry = JSON.parse(raw) as RedisDataCacheEnvelope<T>;
      } catch {
        await this.redis.del(redisKey);
        await removeRedisLruMembers(this.redis, redisDataCacheLruKey(namespace), [key]);
        return { hit: false, value: null, stale: false };
      }

      const now = Date.now();
      if (entry.expiresAt <= now) {
        await this.redis.del(redisKey);
        await removeRedisLruMembers(this.redis, redisDataCacheLruKey(namespace), [key]);
        return { hit: false, value: null, stale: true, asOf: entry.asOf };
      }

      // LRU touch only — keep existing key TTL; avoid rewriting full JSON on hit.
      await this.redis.zadd(redisDataCacheLruKey(namespace), now, key);

      return {
        hit: true,
        value: entry.value,
        stale: false,
        asOf: entry.asOf,
      };
    } catch {
      markServerCacheDegraded();
      return { hit: false, value: null, stale: false };
    }
  }

  async write<T>(
    namespace: CacheNamespace,
    key: string,
    value: T,
    ttlMs: number,
    asOf?: number,
  ): Promise<void> {
    try {
      await ensureRedisConnected(this.redis);
      const now = Date.now();
      const stored = prepareServerSnapshot(value);
      const expiresAt = now + ttlMs;
      const entry: RedisDataCacheEnvelope<T> = {
        value: stored,
        expiresAt,
        asOf,
        touchedAt: now,
        approxBytes: approxPayloadBytes(stored),
      };

      const redisKey = redisDataCacheEntryKey(namespace, key);
      const ttlForRedis = Math.max(ttlMs, 1);
      await this.redis
        .multi()
        .set(redisKey, JSON.stringify(entry), "PX", ttlForRedis)
        .zadd(redisDataCacheLruKey(namespace), now, key)
        .exec();

      await evictRedisUntilWithinBudget(this.redis, {
        lruKey: redisDataCacheLruKey(namespace),
        entryPrefix: `${redisDcEntryPrefix()}${namespace}:`,
        maxEntries: this.maxEntries(namespace),
        softBytes: this.softBytes(namespace),
      });
    } catch {
      markServerCacheDegraded();
    }
  }

  async clear(namespace?: CacheNamespace): Promise<void> {
    await ensureRedisConnected(this.redis);
    if (namespace) {
      await scanDeleteByPrefix(this.redis, `${redisDcEntryPrefix()}${namespace}:`);
      await this.redis.del(redisDataCacheLruKey(namespace));
      return;
    }
    await scanDeleteByPrefix(this.redis, redisDcEntryPrefix());
    const lruKeys = await this.redis.keys(redisDcLruScanPattern());
    if (lruKeys.length > 0) {
      await this.redis.del(...lruKeys);
    }
  }

  async delete(namespace: CacheNamespace, key: string): Promise<void> {
    await ensureRedisConnected(this.redis);
    await this.redis.del(redisDataCacheEntryKey(namespace, key));
    await removeRedisLruMembers(this.redis, redisDataCacheLruKey(namespace), [key]);
  }

  async size(namespace?: CacheNamespace): Promise<number> {
    await ensureRedisConnected(this.redis);
    if (namespace) {
      return this.redis.zcard(redisDataCacheLruKey(namespace));
    }
    const lruKeys = await this.redis.keys(redisDcLruScanPattern());
    if (lruKeys.length === 0) return 0;
    let total = 0;
    for (const lruKey of lruKeys) {
      total += await this.redis.zcard(lruKey);
    }
    return total;
  }

  async approxBytes(namespace?: CacheNamespace): Promise<number> {
    await ensureRedisConnected(this.redis);
    if (namespace) {
      return this.approxBytesForNamespace(namespace);
    }
    const lruKeys = await this.redis.keys(redisDcLruScanPattern());
    let total = 0;
    for (const lruKey of lruKeys) {
      const ns = dataCacheNamespaceFromLruKey(lruKey);
      if (!ns) continue;
      total += await this.approxBytesForNamespace(ns);
    }
    return total;
  }

  private async approxBytesForNamespace(namespace: CacheNamespace): Promise<number> {
    const members = await this.redis.zrange(redisDataCacheLruKey(namespace), 0, -1);
    if (members.length === 0) return 0;
    const pipeline = this.redis.pipeline();
    for (const logical of members) {
      pipeline.get(redisDataCacheEntryKey(namespace, logical));
    }
    const results = await pipeline.exec();
    if (!results) return 0;
    let sum = 0;
    for (const [err, raw] of results) {
      if (err || typeof raw !== "string") continue;
      try {
        const parsed = JSON.parse(raw) as RedisDataCacheEnvelope<unknown>;
        sum += parsed.approxBytes ?? 0;
      } catch {
        // ignore
      }
    }
    return sum;
  }
}
