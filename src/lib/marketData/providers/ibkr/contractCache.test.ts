import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createContractCache } from "./contractCache";

describe("contractCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and returns stock contracts until TTL expires", () => {
    const cache = createContractCache();
    cache.setStock({
      symbol: "AAPL",
      conid: 265598,
      exchange: "NASDAQ",
      currency: "USD",
    });

    expect(cache.getStock("AAPL")?.conid).toBe(265598);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(cache.getStock("AAPL")).toBeNull();
  });

  it("clears all entries", () => {
    const cache = createContractCache();
    cache.setStock({ symbol: "IBM", conid: 8314 });
    cache.clear();
    expect(cache.getStock("IBM")).toBeNull();
  });
});
