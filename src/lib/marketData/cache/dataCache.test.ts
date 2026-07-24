import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataCache } from "./dataCache";
import { cacheTtlMs } from "./ttlPolicy";

describe("DataCache", () => {
  let cache: DataCache;

  beforeEach(() => {
    cache = new DataCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and reads values before ttl expiry", () => {
    cache.write("quotes", "AAPL", [{ symbol: "AAPL" }], 30_000, Date.now());
    const read = cache.read<Array<{ symbol: string }>>("quotes", "AAPL");
    expect(read.hit).toBe(true);
    expect(read.value).toEqual([{ symbol: "AAPL" }]);
  });

  it("returns stale miss after ttl expiry", () => {
    cache.write("quotes", "AAPL", [{ symbol: "AAPL" }], 30_000, 1000);
    vi.advanceTimersByTime(31_000);
    const read = cache.read("quotes", "AAPL");
    expect(read.hit).toBe(false);
    expect(read.stale).toBe(true);
  });

  it("returns shared refs and isolates post-write mutation on originals", () => {
    const original = { symbol: "AAPL", price: 1 };
    cache.write("quotes", "key", original, cacheTtlMs("quotes"));
    original.price = 99;
    const read = cache.read<typeof original>("quotes", "key");
    expect(read.value?.price).toBe(1);
    expect(read.value).not.toBe(original);
  });

  it("evicts least-recently-touched entries when over namespace cap", () => {
    const bounded = new DataCache({ maxEntriesPerNamespace: 2 });
    bounded.write("quotes", "a", { id: "a" }, 60_000);
    vi.advanceTimersByTime(1);
    bounded.write("quotes", "b", { id: "b" }, 60_000);
    vi.advanceTimersByTime(1);
    bounded.read("quotes", "a");
    vi.advanceTimersByTime(1);
    bounded.write("quotes", "c", { id: "c" }, 60_000);

    expect(bounded.read("quotes", "a").hit).toBe(true);
    expect(bounded.read("quotes", "b").hit).toBe(false);
    expect(bounded.read("quotes", "c").hit).toBe(true);
    expect(bounded.size("quotes")).toBe(2);
  });

  it("tracks approximate bytes per namespace", () => {
    cache.write("quotes", "a", { symbol: "AAPL", price: 1 }, 60_000);
    expect(cache.approxBytes("quotes")).toBeGreaterThan(0);
  });
});
