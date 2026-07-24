import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getServerCacheHealthSnapshot,
  type ServerCacheHealthSnapshot,
} from "./serverCacheHealth";
import * as serverCacheBackends from "./serverCacheBackends";
import * as redisClient from "./redisClient";

describe("getServerCacheHealthSnapshot", () => {
  beforeEach(() => {
    serverCacheBackends.resetServerCacheBackendsForTests();
  });

  afterEach(() => {
    serverCacheBackends.resetServerCacheBackendsForTests();
    vi.restoreAllMocks();
  });

  it("returns memory kind with null ping fields", async () => {
    vi.spyOn(serverCacheBackends, "activeServerCacheBackendKind").mockReturnValue("memory");
    vi.spyOn(serverCacheBackends, "isServerCacheDegraded").mockReturnValue(false);

    const snapshot = await getServerCacheHealthSnapshot();

    expect(snapshot).toEqual({
      kind: "memory",
      degraded: false,
      lastPingOk: null,
      lastPingAt: null,
    } satisfies ServerCacheHealthSnapshot);
  });

  it("returns redis kind with ping result when ping succeeds", async () => {
    vi.spyOn(serverCacheBackends, "activeServerCacheBackendKind").mockReturnValue("redis");
    vi.spyOn(serverCacheBackends, "isServerCacheDegraded").mockReturnValue(false);
    vi.spyOn(redisClient, "getSharedRedisClient").mockReturnValue({} as never);
    vi.spyOn(redisClient, "pingRedis").mockResolvedValue(true);

    const snapshot = await getServerCacheHealthSnapshot();

    expect(snapshot.kind).toBe("redis");
    expect(snapshot.degraded).toBe(false);
    expect(snapshot.lastPingOk).toBe(true);
    expect(snapshot.lastPingAt).toBeTypeOf("number");
  });

  it("returns lastPingOk false when redis ping fails", async () => {
    vi.spyOn(serverCacheBackends, "activeServerCacheBackendKind").mockReturnValue("redis");
    vi.spyOn(serverCacheBackends, "isServerCacheDegraded").mockReturnValue(true);
    vi.spyOn(redisClient, "getSharedRedisClient").mockReturnValue({} as never);
    vi.spyOn(redisClient, "pingRedis").mockResolvedValue(false);

    const snapshot = await getServerCacheHealthSnapshot();

    expect(snapshot).toMatchObject({
      kind: "redis",
      degraded: true,
      lastPingOk: false,
    });
    expect(snapshot.lastPingAt).toBeTypeOf("number");
  });

  it("fail-open when shared client throws", async () => {
    vi.spyOn(serverCacheBackends, "activeServerCacheBackendKind").mockReturnValue("redis");
    vi.spyOn(serverCacheBackends, "isServerCacheDegraded").mockReturnValue(false);
    vi.spyOn(redisClient, "getSharedRedisClient").mockImplementation(() => {
      throw new Error("REDIS_URL is required when EDGE_MARKET_DATA_CACHE_BACKEND=redis");
    });

    const snapshot = await getServerCacheHealthSnapshot();

    expect(snapshot).toMatchObject({
      kind: "redis",
      degraded: false,
      lastPingOk: false,
    });
    expect(snapshot.lastPingAt).toBeTypeOf("number");
  });
});
