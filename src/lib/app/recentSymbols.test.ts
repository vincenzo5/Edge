/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_SYMBOLS_KEY,
  RECENT_SYMBOLS_MAX,
  clearRecentSymbols,
  getRecentSymbols,
  recordRecentSymbol,
  seedRecentSymbols,
  subscribeRecentSymbols,
} from "./recentSymbols";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("recentSymbols", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty list when storage is empty", () => {
    expect(getRecentSymbols()).toEqual([]);
  });

  it("records a symbol at the front", () => {
    recordRecentSymbol({ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" });
    expect(getRecentSymbols()).toEqual([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
    ]);
  });

  it("normalizes symbol casing and moves duplicates to front", () => {
    recordRecentSymbol({ symbol: "aapl", name: "Apple Inc.", exchange: "NASDAQ" });
    recordRecentSymbol({ symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" });
    recordRecentSymbol({ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" });

    expect(getRecentSymbols()).toEqual([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
    ]);
  });

  it("caps the list at RECENT_SYMBOLS_MAX", () => {
    for (let i = 0; i < RECENT_SYMBOLS_MAX + 3; i += 1) {
      recordRecentSymbol({
        symbol: `SYM${i}`,
        name: `Symbol ${i}`,
        exchange: "NYSE",
      });
    }

    expect(getRecentSymbols()).toHaveLength(RECENT_SYMBOLS_MAX);
    expect(getRecentSymbols()[0]?.symbol).toBe(`SYM${RECENT_SYMBOLS_MAX + 2}`);
  });

  it("seeds only when storage is empty", () => {
    recordRecentSymbol({ symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ" });

    seedRecentSymbols([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
    ]);

    expect(getRecentSymbols()).toEqual([{ symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ" }]);
  });

  it("seeds deduped symbols when storage is empty", () => {
    seedRecentSymbols([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "aapl", name: "Apple duplicate", exchange: "NASDAQ" },
      { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
    ]);

    expect(getRecentSymbols()).toEqual([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
    ]);
  });

  it("clears stored recents", () => {
    recordRecentSymbol({ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" });
    clearRecentSymbols();
    expect(getRecentSymbols()).toEqual([]);
    expect(localStorageMock.getItem(RECENT_SYMBOLS_KEY)).toBeNull();
  });

  it("notifies subscribers when recents change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRecentSymbols(listener);

    recordRecentSymbol({ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" });

    expect(listener).toHaveBeenCalledWith([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
    ]);

    unsubscribe();
  });
});
