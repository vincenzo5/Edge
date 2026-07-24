import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Redis from "ioredis";
import { createRedisClient } from "./redisClient";
import { isServerCacheDegraded, resetServerCacheDegradedForTests } from "./serverCacheDegraded";
import { RedisHotStore } from "./redisHotStore";

describe("redisClient", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevRequire = process.env.EDGE_REQUIRE_REDIS;
  const prevUrl = process.env.REDIS_URL;

  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  afterEach(() => {
    if (prevNodeEnv !== undefined) {
      process.env.NODE_ENV = prevNodeEnv;
    }
    if (prevRequire !== undefined) {
      process.env.EDGE_REQUIRE_REDIS = prevRequire;
    } else {
      delete process.env.EDGE_REQUIRE_REDIS;
    }
    if (prevUrl !== undefined) {
      process.env.REDIS_URL = prevUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  });

  it("disables offline queue when redis is required", () => {
    process.env.EDGE_REQUIRE_REDIS = "1";
    process.env.NODE_ENV = "test";
    const client = createRedisClient();
    expect((client as Redis & { options: { enableOfflineQueue: boolean } }).options.enableOfflineQueue).toBe(
      false,
    );
    void client.quit().catch(() => undefined);
  });

  it("keeps offline queue enabled when redis is optional", () => {
    delete process.env.EDGE_REQUIRE_REDIS;
    process.env.NODE_ENV = "test";
    const client = createRedisClient();
    expect((client as Redis & { options: { enableOfflineQueue: boolean } }).options.enableOfflineQueue).toBe(
      true,
    );
    void client.quit().catch(() => undefined);
  });
});

describe("redisHotStore fail-open", () => {
  beforeEach(() => {
    resetServerCacheDegradedForTests();
  });

  it("marks degraded and returns miss on transport error", async () => {
    const failingRedis = {
      status: "end",
      connect: vi.fn().mockRejectedValue(new Error("connection refused")),
    } as never;

    const store = new RedisHotStore(failingRedis);
    const result = await store.read("test-key");
    expect(result.hit).toBe(false);
    expect(isServerCacheDegraded()).toBe(true);
  });
});
