import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { HotStoreBackend, DataCacheBackend } from "./cacheBackendTypes";
import { HotStore } from "./memoryHotStore";
import { DataCache } from "./dataCache";
import { RedisHotStore } from "./redisHotStore";
import { RedisDataCache } from "./redisDataCache";
import { createRedisClient, ensureRedisConnected, pingRedis } from "./redisClient";
import { clearRedisEnvKeys } from "./redisTestCleanup";
import { hotQuoteKey } from "../hotStoreConstants";

async function clearRedisTestEnvKeys(): Promise<void> {
  const client = createRedisClient();
  try {
    await ensureRedisConnected(client);
    await clearRedisEnvKeys(client);
  } finally {
    await client.quit().catch(() => undefined);
  }
}

describe("HotStore parity (memory)", () => {
  let store: HotStoreBackend;

  beforeEach(() => {
    store = new HotStore();
  });

  afterEach(async () => {
    await Promise.resolve(store.clear());
  });

  it("returns fresh entries within fresh window", async () => {
    await Promise.resolve(
      store.write("k", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 }),
    );
    const read = await Promise.resolve(store.read<{ value: number }>("k"));
    expect(read.hit).toBe(true);
    expect(read.fresh).toBe(true);
    expect(read.servable).toBe(true);
    expect(read.data?.value).toBe(1);
  });

  it("serves stale entries after fresh window expires", async () => {
    await Promise.resolve(
      store.write("k", { value: 2 }, { source: "yahoo", freshMs: 0, staleMs: 5000 }),
    );
    const read = await Promise.resolve(store.read<{ value: number }>("k"));
    expect(read.hit).toBe(true);
    expect(read.fresh).toBe(false);
    expect(read.servable).toBe(true);
  });

  it("misses after stale window expires", async () => {
    vi.useFakeTimers();
    await Promise.resolve(
      store.write("k", { value: 3 }, { source: "yahoo", freshMs: 0, staleMs: 1000 }),
    );
    vi.advanceTimersByTime(1001);
    const read = await Promise.resolve(store.read<{ value: number }>("k"));
    expect(read.hit).toBe(false);
    vi.useRealTimers();
  });

  it("evicts least-recently-touched entries when over cap", async () => {
    vi.useFakeTimers();
    store = new HotStore({ maxEntries: 2 });
    await Promise.resolve(
      store.write("a", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 }),
    );
    vi.advanceTimersByTime(1);
    await Promise.resolve(
      store.write("b", { value: 2 }, { source: "tws", freshMs: 1000, staleMs: 5000 }),
    );
    vi.advanceTimersByTime(1);
    await Promise.resolve(store.read("a"));
    vi.advanceTimersByTime(1);
    await Promise.resolve(
      store.write("c", { value: 3 }, { source: "tws", freshMs: 1000, staleMs: 5000 }),
    );

    expect((await Promise.resolve(store.read("a"))).hit).toBe(true);
    expect((await Promise.resolve(store.read("b"))).hit).toBe(false);
    expect((await Promise.resolve(store.read("c"))).hit).toBe(true);
    expect(await Promise.resolve(store.size())).toBe(2);
    vi.useRealTimers();
  });

  it("invalidates display data caches by prefix", async () => {
    await Promise.resolve(
      store.write(hotQuoteKey("AAPL"), { symbol: "AAPL" }, {
        source: "tws",
        freshMs: 1000,
        staleMs: 5000,
      }),
    );
    await Promise.resolve(
      store.write("other|key", { x: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 }),
    );
    await Promise.resolve(store.invalidateDisplayDataCaches());
    expect((await Promise.resolve(store.read(hotQuoteKey("AAPL")))).hit).toBe(false);
    expect((await Promise.resolve(store.read("other|key"))).hit).toBe(true);
  });
});

describe("DataCache parity (memory)", () => {
  let store: DataCacheBackend;

  beforeEach(() => {
    store = new DataCache();
  });

  afterEach(async () => {
    await Promise.resolve(store.clear());
  });

  it("stores and reads values before ttl expiry", async () => {
    await Promise.resolve(store.write("quotes", "AAPL", [{ symbol: "AAPL" }], 30_000, Date.now()));
    const read = await Promise.resolve(store.read<Array<{ symbol: string }>>("quotes", "AAPL"));
    expect(read.hit).toBe(true);
    expect(read.value).toEqual([{ symbol: "AAPL" }]);
  });

  it("returns stale miss after ttl expiry", async () => {
    vi.useFakeTimers();
    await Promise.resolve(store.write("quotes", "AAPL", [{ symbol: "AAPL" }], 30_000, 1000));
    vi.advanceTimersByTime(31_000);
    const read = await Promise.resolve(store.read("quotes", "AAPL"));
    expect(read.hit).toBe(false);
    expect(read.stale).toBe(true);
    vi.useRealTimers();
  });

  it("evicts least-recently-touched entries when over namespace cap", async () => {
    vi.useFakeTimers();
    store = new DataCache({ maxEntriesPerNamespace: 2 });
    await Promise.resolve(store.write("quotes", "a", { id: "a" }, 60_000));
    vi.advanceTimersByTime(1);
    await Promise.resolve(store.write("quotes", "b", { id: "b" }, 60_000));
    vi.advanceTimersByTime(1);
    await Promise.resolve(store.read("quotes", "a"));
    vi.advanceTimersByTime(1);
    await Promise.resolve(store.write("quotes", "c", { id: "c" }, 60_000));

    expect((await Promise.resolve(store.read("quotes", "a"))).hit).toBe(true);
    expect((await Promise.resolve(store.read("quotes", "b"))).hit).toBe(false);
    expect((await Promise.resolve(store.read("quotes", "c"))).hit).toBe(true);
    expect(await Promise.resolve(store.size("quotes"))).toBe(2);
    vi.useRealTimers();
  });
});

const redisUrl = process.env.REDIS_URL?.trim();
const shouldRunRedisTests =
  process.env.EDGE_TEST_REDIS === "1" || process.env.EDGE_MARKET_DATA_CACHE_BACKEND === "redis";

describe.skipIf(!shouldRunRedisTests || !redisUrl)("HotStore parity (redis)", () => {
  let store: RedisHotStore;
  let redisOk = false;

  beforeAll(async () => {
    const client = createRedisClient();
    redisOk = await pingRedis(client);
    await client.quit().catch(() => undefined);
  });

  beforeEach(async () => {
    await clearRedisTestEnvKeys();
    store = new RedisHotStore(createRedisClient(), { maxEntries: 2 });
  });

  afterEach(async () => {
    if (store) {
      await store.clear();
    }
    await clearRedisTestEnvKeys();
  });

  it("redis is reachable", () => {
    expect(redisOk).toBe(true);
  });

  it("returns fresh entries within fresh window", async () => {
    await store.write("k", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    const read = await store.read<{ value: number }>("k");
    expect(read.hit).toBe(true);
    expect(read.fresh).toBe(true);
    expect(read.data?.value).toBe(1);
  });

  it("evicts least-recently-touched entries when over cap", async () => {
    vi.useFakeTimers();
    await store.write("a", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    vi.advanceTimersByTime(1);
    await store.write("b", { value: 2 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    vi.advanceTimersByTime(1);
    await store.read("a");
    vi.advanceTimersByTime(1);
    await store.write("c", { value: 3 }, { source: "tws", freshMs: 1000, staleMs: 5000 });

    expect((await store.read("a")).hit).toBe(true);
    expect((await store.read("b")).hit).toBe(false);
    expect((await store.read("c")).hit).toBe(true);
    expect(await store.size()).toBe(2);
    vi.useRealTimers();
  });
});

describe.skipIf(!shouldRunRedisTests || !redisUrl)("DataCache parity (redis)", () => {
  let store: RedisDataCache;

  beforeEach(async () => {
    await clearRedisTestEnvKeys();
    store = new RedisDataCache(createRedisClient(), { maxEntriesPerNamespace: 2 });
  });

  afterEach(async () => {
    if (store) {
      await store.clear();
    }
    await clearRedisTestEnvKeys();
  });

  it("stores and reads values before ttl expiry", async () => {
    await store.write("quotes", "AAPL", [{ symbol: "AAPL" }], 30_000, Date.now());
    const read = await store.read<Array<{ symbol: string }>>("quotes", "AAPL");
    expect(read.hit).toBe(true);
    expect(read.value).toEqual([{ symbol: "AAPL" }]);
  });

  it("evicts least-recently-touched entries when over namespace cap", async () => {
    vi.useFakeTimers();
    await store.write("quotes", "a", { id: "a" }, 60_000);
    vi.advanceTimersByTime(1);
    await store.write("quotes", "b", { id: "b" }, 60_000);
    vi.advanceTimersByTime(1);
    await store.read("quotes", "a");
    vi.advanceTimersByTime(1);
    await store.write("quotes", "c", { id: "c" }, 60_000);

    expect((await store.read("quotes", "a")).hit).toBe(true);
    expect((await store.read("quotes", "b")).hit).toBe(false);
    expect((await store.read("quotes", "c")).hit).toBe(true);
    expect(await store.size("quotes")).toBe(2);
    vi.useRealTimers();
  });
});
