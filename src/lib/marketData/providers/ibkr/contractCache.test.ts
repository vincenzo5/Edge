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

  it("prefers evicting strikes/optInfo before stock when over cap", () => {
    const cache = createContractCache({ maxEntries: 2 });
    cache.setStock({ symbol: "AAPL", conid: 1 });
    cache.setStrikes(1, "202601", { call: [100], put: [100] });
    cache.setStrikes(1, "202602", { call: [110], put: [110] });

    expect(cache.getStock("AAPL")?.conid).toBe(1);
    expect(cache.getStrikes(1, "202601")).toBeNull();
    expect(cache.getStrikes(1, "202602")).not.toBeNull();
    expect(cache.size()).toBe(2);
  });
});
