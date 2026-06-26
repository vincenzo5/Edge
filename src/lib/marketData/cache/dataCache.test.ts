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

  it("clones cached values on read and write", () => {
    const original = { symbol: "AAPL", price: 1 };
    cache.write("quotes", "key", original, cacheTtlMs("quotes"));
    original.price = 99;
    const read = cache.read<typeof original>("quotes", "key");
    expect(read.value?.price).toBe(1);
  });
});
