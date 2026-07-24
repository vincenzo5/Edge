import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSharedClientTtlCacheForTests,
  getSharedClientTtlCache,
} from "@/lib/marketData/cache/clientTtlCache";
import {
  buildJournalTradesCacheKey,
  invalidateJournalPersistenceCache,
  invalidatePatternLibraryRecordsCache,
  JOURNAL_FILLS_CACHE_KEY,
  PATTERN_LIBRARY_RECORDS_CACHE_KEY,
} from "./persistenceClientCache";

describe("persistenceClientCache", () => {
  beforeEach(() => {
    clearSharedClientTtlCacheForTests();
  });

  it("buildJournalTradesCacheKey normalizes query parts", () => {
    expect(buildJournalTradesCacheKey({ status: "open", symbol: "aapl" })).toBe(
      buildJournalTradesCacheKey({ status: "open", symbol: "AAPL" }),
    );
  });

  it("invalidateJournalPersistenceCache clears trades prefix and fills key", () => {
    const cache = getSharedClientTtlCache();
    cache.set(buildJournalTradesCacheKey({ status: "all" }), [{ id: "1" }], 15_000);
    cache.set(JOURNAL_FILLS_CACHE_KEY, [{ execId: "x" }], 15_000);
    cache.set("search|aapl", [], 60_000);

    invalidateJournalPersistenceCache();

    expect(cache.get(buildJournalTradesCacheKey({ status: "all" }))).toBeUndefined();
    expect(cache.get(JOURNAL_FILLS_CACHE_KEY)).toBeUndefined();
    expect(cache.get("search|aapl")).toEqual([]);
  });

  it("invalidatePatternLibraryRecordsCache clears list key only", () => {
    const cache = getSharedClientTtlCache();
    cache.set(PATTERN_LIBRARY_RECORDS_CACHE_KEY, [{ id: "p1" }], 60_000);
    cache.set(JOURNAL_FILLS_CACHE_KEY, [{ execId: "x" }], 15_000);

    invalidatePatternLibraryRecordsCache();

    expect(cache.get(PATTERN_LIBRARY_RECORDS_CACHE_KEY)).toBeUndefined();
    expect(cache.get(JOURNAL_FILLS_CACHE_KEY)).toEqual([{ execId: "x" }]);
  });
});
