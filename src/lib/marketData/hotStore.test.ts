import { describe, it, expect, beforeEach } from "vitest";
import {
  HotStore,
  hotCandlesKey,
  hotQuoteKey,
  writeHotQuote,
  clearHotStoreForTests,
  globalHotStore,
} from "./hotStore";

describe("HotStore", () => {
  beforeEach(() => {
    clearHotStoreForTests();
  });

  it("returns fresh entries within fresh window", () => {
    const store = new HotStore();
    store.write("k", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    const read = store.read<{ value: number }>("k");
    expect(read.hit).toBe(true);
    expect(read.fresh).toBe(true);
    expect(read.servable).toBe(true);
    expect(read.data?.value).toBe(1);
  });

  it("serves stale entries after fresh window expires", () => {
    const store = new HotStore();
    store.write("k", { value: 2 }, { source: "yahoo", freshMs: 0, staleMs: 5000 });
    const read = store.read<{ value: number }>("k");
    expect(read.hit).toBe(true);
    expect(read.fresh).toBe(false);
    expect(read.servable).toBe(true);
  });

  it("misses after stale window expires", () => {
    const store = new HotStore();
    store.write("k", { value: 3 }, { source: "yahoo", freshMs: 0, staleMs: 0 });
    const read = store.read<{ value: number }>("k");
    expect(read.hit).toBe(false);
  });

  it("writes per-symbol quote keys", () => {
    writeHotQuote(
      {
        symbol: "AAPL",
        price: 150,
        change: 1,
        changePercent: 1,
        volume: 100,
        updatedAt: Date.now(),
      },
      "tws",
    );
    const read = globalHotStore.read(hotQuoteKey("AAPL"));
    expect(read.hit).toBe(true);
    expect(read.source).toBe("tws");
  });

  it("builds stable candle keys", () => {
    expect(
      hotCandlesKey({ symbol: "AAPL", interval: "1d", range: "1y" }),
    ).toContain("AAPL");
  });
});
