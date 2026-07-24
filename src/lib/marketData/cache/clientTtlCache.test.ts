import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildClientCacheKey,
  CLIENT_CACHE_TTL_MS,
  normalizeClientCacheQuery,
  normalizeClientCacheSymbol,
} from "./clientCachePolicy";
import { CACHE_TTL_MS } from "./ttlPolicy";
import {
  ClientTtlCache,
  clearSharedClientTtlCacheForTests,
  getSharedClientTtlCache,
} from "./clientTtlCache";

describe("ClientTtlCache", () => {
  let cache: ClientTtlCache<{ price: number }>;

  beforeEach(() => {
    cache = new ClientTtlCache(64, () => Date.now());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearSharedClientTtlCacheForTests();
  });

  it("stores and reads values before ttl expiry", () => {
    cache.set("aapl", { price: 100 }, 30_000);
    expect(cache.get("aapl")).toEqual({ price: 100 });
  });

  it("returns undefined after ttl expiry and deletes stale entry", () => {
    cache.set("aapl", { price: 100 }, 30_000);
    vi.advanceTimersByTime(31_000);
    expect(cache.get("aapl")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("clones cached values on read and write", () => {
    const original = { price: 1 };
    cache.set("key", original, 30_000);
    original.price = 99;
    expect(cache.get("key")?.price).toBe(1);
    const read = cache.get("key");
    if (read) read.price = 42;
    expect(cache.get("key")?.price).toBe(1);
  });

  it("invalidate removes a single key", () => {
    cache.set("a", { price: 1 }, 30_000);
    cache.set("b", { price: 2 }, 30_000);
    cache.invalidate("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toEqual({ price: 2 });
  });

  it("invalidateByPrefix removes matching keys", () => {
    cache.set("journal_trades|all|||", { id: "1" }, 30_000);
    cache.set("journal_fills|all", { execId: "x" }, 30_000);
    cache.set("search|aapl", { symbol: "AAPL" }, 30_000);
    cache.invalidateByPrefix("journal_trades|");
    expect(cache.get("journal_trades|all|||")).toBeUndefined();
    expect(cache.get("journal_fills|all")).toEqual({ execId: "x" });
    expect(cache.get("search|aapl")).toEqual({ symbol: "AAPL" });
  });

  it("clear removes all entries", () => {
    cache.set("a", { price: 1 }, 30_000);
    cache.set("b", { price: 2 }, 30_000);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("evicts oldest entry when max entries exceeded", () => {
    const small = new ClientTtlCache<{ n: number }>(2, () => Date.now());
    small.set("first", { n: 1 }, 60_000);
    vi.advanceTimersByTime(1_000);
    small.set("second", { n: 2 }, 60_000);
    vi.advanceTimersByTime(1_000);
    small.set("third", { n: 3 }, 60_000);
    expect(small.get("first")).toBeUndefined();
    expect(small.get("second")).toEqual({ n: 2 });
    expect(small.get("third")).toEqual({ n: 3 });
    expect(small.size()).toBe(2);
  });

  it("shared singleton returns same instance", () => {
    const a = getSharedClientTtlCache();
    const b = getSharedClientTtlCache();
    expect(a).toBe(b);
    a.set("probe", { ok: true }, 60_000);
    expect(b.get("probe")).toEqual({ ok: true });
  });
});

describe("clientCachePolicy", () => {
  it("buildClientCacheKey joins namespace and parts", () => {
    expect(buildClientCacheKey("search", ["aapl"])).toBe("search|aapl");
    expect(buildClientCacheKey("fundamentals", ["AAPL"])).toBe("fundamentals|AAPL");
  });

  it("normalizes query and symbol for Phase 1 keys", () => {
    expect(normalizeClientCacheQuery("  Aapl ")).toBe("aapl");
    expect(normalizeClientCacheSymbol(" aapl ")).toBe("AAPL");
  });

  it("client TTLs are <= matching server CACHE_TTL_MS where aligned", () => {
    const serverAligned: Array<keyof typeof CACHE_TTL_MS> = [
      "search",
      "fundamentals",
      "events",
      "news",
      "options_expirations",
      "market_context",
      "quotes",
    ];
    for (const namespace of serverAligned) {
      expect(CLIENT_CACHE_TTL_MS[namespace]).toBeLessThanOrEqual(CACHE_TTL_MS[namespace]);
    }
    expect(CLIENT_CACHE_TTL_MS.journal_trades).toBe(15_000);
    expect(CLIENT_CACHE_TTL_MS.pattern_library_records).toBe(60_000);
  });
});
