import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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

  it("preserves SWR semantics for retained keys after cold eviction of other keys", () => {
    vi.useFakeTimers();
    const store = new HotStore({ maxEntries: 2 });
    store.write("keep", { value: 1 }, { source: "tws", freshMs: 0, staleMs: 60_000 });
    vi.advanceTimersByTime(1);
    store.write("drop", { value: 2 }, { source: "tws", freshMs: 0, staleMs: 60_000 });
    vi.advanceTimersByTime(1);
    store.read("keep");
    vi.advanceTimersByTime(1);
    store.write("new", { value: 3 }, { source: "tws", freshMs: 0, staleMs: 60_000 });

    const kept = store.read<{ value: number }>("keep");
    expect(kept.hit).toBe(true);
    expect(kept.servable).toBe(true);
    expect(kept.fresh).toBe(false);
    expect(store.read("drop").hit).toBe(false);
    vi.useRealTimers();
  });

  it("evicts least-recently-touched entries when over cap", () => {
    vi.useFakeTimers();
    const store = new HotStore({ maxEntries: 2 });
    store.write("a", { value: 1 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    vi.advanceTimersByTime(1);
    store.write("b", { value: 2 }, { source: "tws", freshMs: 1000, staleMs: 5000 });
    vi.advanceTimersByTime(1);
    store.read("a");
    vi.advanceTimersByTime(1);
    store.write("c", { value: 3 }, { source: "tws", freshMs: 1000, staleMs: 5000 });

    expect(store.read("a").hit).toBe(true);
    expect(store.read("b").hit).toBe(false);
    expect(store.read("c").hit).toBe(true);
    expect(store.size()).toBe(2);
    vi.useRealTimers();
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
