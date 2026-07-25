import { describe, it, expect, vi, beforeEach } from "vitest";
import type Redis from "ioredis";
import { RedisDataCache } from "./redisDataCache";
import type { RedisDataCacheEnvelope } from "./redisDataCache";

function makeEnvelope<T>(value: T): RedisDataCacheEnvelope<T> {
  const now = Date.now();
  return {
    value,
    expiresAt: now + 60_000,
    asOf: now,
    touchedAt: now,
    approxBytes: 64,
  };
}

function createMockRedis(raw: string | null): {
  redis: Redis;
  setCalls: unknown[][];
} {
  const setCalls: unknown[][] = [];
  const multiChain = {
    set: vi.fn(function (...args: unknown[]) {
      setCalls.push(args);
      return multiChain;
    }),
    zadd: vi.fn(function () {
      return multiChain;
    }),
    exec: vi.fn().mockResolvedValue([]),
  };
  const redis = {
    get: vi.fn().mockResolvedValue(raw),
    zadd: vi.fn().mockResolvedValue(1),
    multi: vi.fn(() => multiChain),
    del: vi.fn().mockResolvedValue(1),
  } as unknown as Redis;
  return { redis, setCalls };
}

vi.mock("./redisClient", () => ({
  ensureRedisConnected: vi.fn().mockResolvedValue(undefined),
}));

describe("RedisDataCache read hit path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("touches LRU without rewriting payload on cache hit", async () => {
    const envelope = makeEnvelope({ candles: [] });
    const { redis, setCalls } = createMockRedis(JSON.stringify(envelope));
    const cache = new RedisDataCache(redis);

    const result = await cache.read("candles", "AAPL|1d");

    expect(result.hit).toBe(true);
    expect(result.value).toEqual({ candles: [] });
    expect(setCalls).toHaveLength(0);
    expect(redis.multi).not.toHaveBeenCalled();
    expect(redis.zadd).toHaveBeenCalledTimes(1);
  });
});
