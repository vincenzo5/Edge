import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createServerCacheBackends,
  ensureServerCacheBackendsInitialized,
  getServerCacheBackends,
  globalHotStore,
  resetServerCacheBackendsForTests,
} from "./serverCacheBackends";
import { isRedisRequired, resolveMarketDataCacheBackendKind } from "./cacheBackendTypes";
import * as redisClient from "./redisClient";

describe("serverCacheBackends", () => {
  beforeEach(() => {
    resetServerCacheBackendsForTests();
  });

  it("defaults to memory backend when env unset", async () => {
    const prev = process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    delete process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    try {
      expect(resolveMarketDataCacheBackendKind()).toBe("memory");
      const backends = await createServerCacheBackends();
      expect(backends.kind).toBe("memory");
    } finally {
      if (prev !== undefined) {
        process.env.EDGE_MARKET_DATA_CACHE_BACKEND = prev;
      }
    }
  });

  it("falls back to memory when redis env set without REDIS_URL and require is off", async () => {
    const prevBackend = process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    const prevUrl = process.env.REDIS_URL;
    const prevRequire = process.env.EDGE_REQUIRE_REDIS;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.EDGE_MARKET_DATA_CACHE_BACKEND = "redis";
    delete process.env.REDIS_URL;
    delete process.env.EDGE_REQUIRE_REDIS;
    process.env.NODE_ENV = "test";
    try {
      expect(isRedisRequired()).toBe(false);
      const backends = await createServerCacheBackends();
      expect(backends.kind).toBe("memory");
    } finally {
      if (prevBackend !== undefined) {
        process.env.EDGE_MARKET_DATA_CACHE_BACKEND = prevBackend;
      } else {
        delete process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
      }
      if (prevUrl !== undefined) {
        process.env.REDIS_URL = prevUrl;
      }
      if (prevRequire !== undefined) {
        process.env.EDGE_REQUIRE_REDIS = prevRequire;
      }
      if (prevNodeEnv !== undefined) {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });

  it("throws when redis required and REDIS_URL is unset", async () => {
    const prevBackend = process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    const prevUrl = process.env.REDIS_URL;
    const prevRequire = process.env.EDGE_REQUIRE_REDIS;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.EDGE_MARKET_DATA_CACHE_BACKEND = "redis";
    delete process.env.REDIS_URL;
    process.env.EDGE_REQUIRE_REDIS = "1";
    process.env.NODE_ENV = "test";
    try {
      expect(isRedisRequired()).toBe(true);
      await expect(createServerCacheBackends()).rejects.toThrow(/Redis is required/);
    } finally {
      if (prevBackend !== undefined) {
        process.env.EDGE_MARKET_DATA_CACHE_BACKEND = prevBackend;
      } else {
        delete process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
      }
      if (prevUrl !== undefined) {
        process.env.REDIS_URL = prevUrl;
      }
      if (prevRequire !== undefined) {
        process.env.EDGE_REQUIRE_REDIS = prevRequire;
      } else {
        delete process.env.EDGE_REQUIRE_REDIS;
      }
      if (prevNodeEnv !== undefined) {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });

  it("throws when redis required and ping fails", async () => {
    const prevBackend = process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    const prevUrl = process.env.REDIS_URL;
    const prevRequire = process.env.EDGE_REQUIRE_REDIS;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.EDGE_MARKET_DATA_CACHE_BACKEND = "redis";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.EDGE_REQUIRE_REDIS = "1";
    process.env.NODE_ENV = "test";

    const pingSpy = vi.spyOn(redisClient, "pingRedis").mockResolvedValue(false);
    const quitSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(redisClient, "createRedisClient").mockReturnValue({
      quit: quitSpy,
    } as never);

    try {
      await expect(createServerCacheBackends()).rejects.toThrow(/Redis is required/);
      expect(quitSpy).toHaveBeenCalled();
    } finally {
      pingSpy.mockRestore();
      vi.restoreAllMocks();
      if (prevBackend !== undefined) {
        process.env.EDGE_MARKET_DATA_CACHE_BACKEND = prevBackend;
      } else {
        delete process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
      }
      if (prevUrl !== undefined) {
        process.env.REDIS_URL = prevUrl;
      } else {
        delete process.env.REDIS_URL;
      }
      if (prevRequire !== undefined) {
        process.env.EDGE_REQUIRE_REDIS = prevRequire;
      } else {
        delete process.env.EDGE_REQUIRE_REDIS;
      }
      if (prevNodeEnv !== undefined) {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });

  it("upgrades to redis after pre-init proxy touch when ping succeeds", async () => {
    const prevBackend = process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
    const prevUrl = process.env.REDIS_URL;
    const prevRequire = process.env.EDGE_REQUIRE_REDIS;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.EDGE_MARKET_DATA_CACHE_BACKEND = "redis";
    process.env.REDIS_URL = "redis://localhost:6379";
    delete process.env.EDGE_REQUIRE_REDIS;
    process.env.NODE_ENV = "test";

    const pingSpy = vi.spyOn(redisClient, "pingRedis").mockResolvedValue(true);
    const mockClient = { status: "ready" } as never;
    vi.spyOn(redisClient, "createRedisClient").mockReturnValue(mockClient);

    try {
      expect(getServerCacheBackends().kind).toBe("memory");
      void globalHotStore.size();
      expect(getServerCacheBackends().kind).toBe("memory");

      const backends = await ensureServerCacheBackendsInitialized();
      expect(backends.kind).toBe("redis");
      expect(getServerCacheBackends().kind).toBe("redis");
    } finally {
      pingSpy.mockRestore();
      vi.restoreAllMocks();
      if (prevBackend !== undefined) {
        process.env.EDGE_MARKET_DATA_CACHE_BACKEND = prevBackend;
      } else {
        delete process.env.EDGE_MARKET_DATA_CACHE_BACKEND;
      }
      if (prevUrl !== undefined) {
        process.env.REDIS_URL = prevUrl;
      } else {
        delete process.env.REDIS_URL;
      }
      if (prevRequire !== undefined) {
        process.env.EDGE_REQUIRE_REDIS = prevRequire;
      }
      if (prevNodeEnv !== undefined) {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });
});
