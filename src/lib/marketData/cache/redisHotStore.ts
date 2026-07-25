import type Redis from "ioredis";
import {
  HOT_STORE_MAX_ENTRIES,
  HOT_STORE_SOFT_BYTE_BUDGET,
} from "./cacheBudgets";
import type { HotStoreBackend, HotReadResult } from "./cacheBackendTypes";
import { approxPayloadBytes, prepareServerSnapshot } from "./immutableSnapshot";
import { ensureRedisConnected } from "./redisClient";
import { markServerCacheDegraded } from "./serverCacheDegraded";
import {
  evictRedisUntilWithinBudget,
  removeRedisLruMembers,
  scanDeleteByPrefix,
} from "./redisEviction";
import {
  isDisplayHotLogicalKey,
  redisHotEntryKey,
  redisHotEntryPrefix,
  redisHotLruKey,
} from "./redisKeys";

export type RedisHotEnvelope<T> = {
  data: T;
  source: string;
  asOf: number;
  freshUntil: number;
  staleUntil: number;
  warnings: string[];
  touchedAt: number;
  approxBytes: number;
};

export type RedisHotStoreOptions = {
  maxEntries?: number;
  softByteBudget?: number;
};

export class RedisHotStore implements HotStoreBackend {
  constructor(
    private readonly redis: Redis,
    private readonly options: RedisHotStoreOptions = {},
  ) {}

  async read<T>(key: string): Promise<HotReadResult<T>> {
    try {
      await ensureRedisConnected(this.redis);
      const redisKey = redisHotEntryKey(key);
      const raw = await this.redis.get(redisKey);
      if (!raw) {
        return { hit: false, data: null, fresh: false, servable: false };
      }

      let entry: RedisHotEnvelope<T>;
      try {
        entry = JSON.parse(raw) as RedisHotEnvelope<T>;
      } catch {
        await this.redis.del(redisKey);
        await removeRedisLruMembers(this.redis, redisHotLruKey(), [key]);
        return { hit: false, data: null, fresh: false, servable: false };
      }

      const now = Date.now();
      if (now >= entry.staleUntil) {
        await this.redis.del(redisKey);
        await removeRedisLruMembers(this.redis, redisHotLruKey(), [key]);
        return { hit: false, data: null, fresh: false, servable: false };
      }

      // LRU touch only — keep existing key TTL; avoid rewriting full JSON on hit.
      await this.redis.zadd(redisHotLruKey(), now, key);

      const fresh = now < entry.freshUntil;
      return {
        hit: true,
        data: entry.data,
        fresh,
        servable: true,
        asOf: entry.asOf,
        source: entry.source,
        warnings: [...entry.warnings],
      };
    } catch {
      markServerCacheDegraded();
      return { hit: false, data: null, fresh: false, servable: false };
    }
  }

  async write<T>(
    key: string,
    data: T,
    options: {
      source: string;
      freshMs: number;
      staleMs: number;
      asOf?: number;
      warnings?: string[];
    },
  ): Promise<void> {
    try {
      await ensureRedisConnected(this.redis);
      const now = Date.now();
      const asOf = options.asOf ?? now;
      const stored = prepareServerSnapshot(data);
      const staleUntil = now + options.staleMs;
      const entry: RedisHotEnvelope<T> = {
        data: stored,
        source: options.source,
        asOf,
        freshUntil: now + options.freshMs,
        staleUntil,
        warnings: options.warnings ?? [],
        touchedAt: now,
        approxBytes: approxPayloadBytes(stored),
      };

      const redisKey = redisHotEntryKey(key);
      await this.redis
        .multi()
        .set(redisKey, JSON.stringify(entry), "PXAT", staleUntil)
        .zadd(redisHotLruKey(), now, key)
        .exec();

      await evictRedisUntilWithinBudget(this.redis, {
        lruKey: redisHotLruKey(),
        entryPrefix: redisHotEntryPrefix(),
        maxEntries: this.options.maxEntries ?? HOT_STORE_MAX_ENTRIES,
        softBytes: this.options.softByteBudget ?? HOT_STORE_SOFT_BYTE_BUDGET,
      });
    } catch {
      markServerCacheDegraded();
    }
  }

  async clear(): Promise<void> {
    await ensureRedisConnected(this.redis);
    await scanDeleteByPrefix(this.redis, redisHotEntryPrefix());
    await this.redis.del(redisHotLruKey());
  }

  async invalidate(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await ensureRedisConnected(this.redis);
    const redisKeys = keys.map(redisHotEntryKey);
    await this.redis.del(...redisKeys);
    await removeRedisLruMembers(this.redis, redisHotLruKey(), keys);
  }

  async invalidateDisplayDataCaches(): Promise<void> {
    await ensureRedisConnected(this.redis);
    const members = await this.redis.zrange(redisHotLruKey(), 0, -1);
    const displayKeys = members.filter(isDisplayHotLogicalKey);
    if (displayKeys.length === 0) return;
    await this.invalidate(displayKeys);
  }

  async size(): Promise<number> {
    await ensureRedisConnected(this.redis);
    return this.redis.zcard(redisHotLruKey());
  }

  async approxTotalBytes(): Promise<number> {
    await ensureRedisConnected(this.redis);
    const members = await this.redis.zrange(redisHotLruKey(), 0, -1);
    if (members.length === 0) return 0;
    const pipeline = this.redis.pipeline();
    for (const logical of members) {
      pipeline.get(redisHotEntryKey(logical));
    }
    const results = await pipeline.exec();
    if (!results) return 0;
    let sum = 0;
    for (const [err, raw] of results) {
      if (err || typeof raw !== "string") continue;
      try {
        const parsed = JSON.parse(raw) as RedisHotEnvelope<unknown>;
        sum += parsed.approxBytes ?? 0;
      } catch {
        // ignore
      }
    }
    return sum;
  }
}
