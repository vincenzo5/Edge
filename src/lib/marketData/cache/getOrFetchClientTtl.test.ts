import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clearSharedClientTtlCacheForTests,
  getSharedClientTtlCache,
} from "./clientTtlCache";
import {
  getOrFetchClientTtl,
  resetClientTtlFetchCoalesceForTests,
} from "./getOrFetchClientTtl";

describe("getOrFetchClientTtl", () => {
  beforeEach(() => {
    clearSharedClientTtlCacheForTests();
    resetClientTtlFetchCoalesceForTests();
  });

  afterEach(() => {
    clearSharedClientTtlCacheForTests();
    resetClientTtlFetchCoalesceForTests();
  });

  it("returns cached value on hit without calling fetch", async () => {
    const fetchFn = vi.fn(async () => "fresh");
    getSharedClientTtlCache().set("search|aapl|8", "cached", 60_000);

    const result = await getOrFetchClientTtl("search", "search|aapl|8", fetchFn);
    expect(result).toBe("cached");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches and stores on miss", async () => {
    const fetchFn = vi.fn(async () => ({ symbol: "AAPL" }));

    const first = await getOrFetchClientTtl("fundamentals", "fundamentals|AAPL", fetchFn);
    const second = await getOrFetchClientTtl("fundamentals", "fundamentals|AAPL", fetchFn);

    expect(first).toEqual({ symbol: "AAPL" });
    expect(second).toEqual({ symbol: "AAPL" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent misses for the same key", async () => {
    let resolveFetch: ((value: string) => void) | undefined;
    const fetchFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = getOrFetchClientTtl("news", "news|AAPL|20", fetchFn);
    const second = getOrFetchClientTtl("news", "news|AAPL|20", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFetch?.("payload");
    await expect(first).resolves.toBe("payload");
    await expect(second).resolves.toBe("payload");
  });

  it("does not cache when fetch throws", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network");
    });

    await expect(getOrFetchClientTtl("search", "search|msft|8", fetchFn)).rejects.toThrow(
      "network",
    );
    expect(getSharedClientTtlCache().get("search|msft|8")).toBeUndefined();
  });

  it("uses ttlMs override when provided", async () => {
    const fetchFn = vi.fn(async () => "payload");
    await getOrFetchClientTtl("ai_candles", "ai_candles|AAPL|1mo|1d||", fetchFn, {
      ttlMs: 5_000,
    });

    const entry = getSharedClientTtlCache().get("ai_candles|AAPL|1mo|1d||");
    expect(entry).toBe("payload");
  });
});
