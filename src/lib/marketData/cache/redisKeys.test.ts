import { afterEach, describe, expect, it } from "vitest";
import {
  REDIS_MD_SCHEMA_VERSION,
  dataCacheNamespaceFromLruKey,
  redisDataCacheEntryKey,
  redisDataCacheLruKey,
  redisDcLruScanPattern,
  redisHotEntryKey,
  redisHotEntryPrefix,
  redisHotLruKey,
  redisMdKeyRoot,
  resolveRedisCacheEnv,
} from "./redisKeys";

describe("redisKeys", () => {
  const prevEdgeCacheEnv = process.env.EDGE_CACHE_ENV;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevEdgeCacheEnv === undefined) {
      delete process.env.EDGE_CACHE_ENV;
    } else {
      process.env.EDGE_CACHE_ENV = prevEdgeCacheEnv;
    }
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("builds scoped hot and data-cache keys from env + schema root", () => {
    process.env.EDGE_CACHE_ENV = "staging";
    delete process.env.NODE_ENV;

    const root = redisMdKeyRoot();
    expect(root).toBe(`edge:staging:${REDIS_MD_SCHEMA_VERSION}:md`);
    expect(redisHotEntryPrefix()).toBe(`${root}:hot:entry:`);
    expect(redisHotLruKey()).toBe(`${root}:hot:lru`);
    expect(redisHotEntryKey("hot|quote|AAPL")).toBe(
      `${root}:hot:entry:hot|quote|AAPL`,
    );
    expect(redisDataCacheEntryKey("candles", "yahoo|AAPL|5m")).toBe(
      `${root}:dc:entry:candles:yahoo|AAPL|5m`,
    );
    expect(redisDataCacheLruKey("candles")).toBe(`${root}:dc:lru:candles`);
    expect(redisDcLruScanPattern()).toBe(`${root}:dc:lru:*`);
  });

  it("maps NODE_ENV when EDGE_CACHE_ENV is unset", () => {
    delete process.env.EDGE_CACHE_ENV;
    process.env.NODE_ENV = "production";
    expect(resolveRedisCacheEnv()).toBe("prod");
    expect(redisMdKeyRoot()).toBe(`edge:prod:${REDIS_MD_SCHEMA_VERSION}:md`);

    process.env.NODE_ENV = "test";
    expect(resolveRedisCacheEnv()).toBe("test");
  });

  it("isolates two deploy envs against one Redis (disjoint key roots)", () => {
    process.env.EDGE_CACHE_ENV = "staging";
    const stagingRoot = redisMdKeyRoot();
    const stagingHot = redisHotEntryKey("hot|quote|MSFT");

    process.env.EDGE_CACHE_ENV = "prod";
    const prodRoot = redisMdKeyRoot();
    const prodHot = redisHotEntryKey("hot|quote|MSFT");

    expect(stagingRoot).not.toBe(prodRoot);
    expect(stagingHot.startsWith(prodHot)).toBe(false);
    expect(prodHot.startsWith(stagingHot)).toBe(false);
  });

  it("maps frozen local dev/prod cache segments to disjoint roots", () => {
    process.env.EDGE_CACHE_ENV = "dev";
    const devRoot = redisMdKeyRoot();

    process.env.EDGE_CACHE_ENV = "prod";
    const prodRoot = redisMdKeyRoot();

    expect(devRoot).toBe("edge:dev:1:md");
    expect(prodRoot).toBe("edge:prod:1:md");
    expect(devRoot).not.toBe(prodRoot);
  });

  it("derives data-cache namespace from scoped LRU key", () => {
    process.env.EDGE_CACHE_ENV = "staging";
    const lruKey = redisDataCacheLruKey("quotes");
    expect(dataCacheNamespaceFromLruKey(lruKey)).toBe("quotes");
    expect(dataCacheNamespaceFromLruKey("edge:legacy:md:dc:lru:quotes")).toBeNull();
  });

  it("sanitizes EDGE_CACHE_ENV segments", () => {
    process.env.EDGE_CACHE_ENV = "My Staging Env!";
    expect(resolveRedisCacheEnv()).toBe("my-staging-env");
  });
});
