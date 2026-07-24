import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSharedClientTtlCacheForTests,
  getSharedClientTtlCache,
} from "@/lib/marketData/cache/clientTtlCache";
import { PATTERN_LIBRARY_RECORDS_CACHE_KEY } from "./persistenceClientCache";
import {
  fetchPatternLibraryRecordSummaries,
  invalidatePatternLibraryRecordsCache,
} from "./patternLibraryRecordsClient";

describe("patternLibraryRecordsClient", () => {
  beforeEach(() => {
    clearSharedClientTtlCacheForTests();
    vi.restoreAllMocks();
  });

  it("reuses cached record summaries within TTL", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ records: [{ id: "capture-1", setupFamilyId: "breakout" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchPatternLibraryRecordSummaries();
    const second = await fetchPatternLibraryRecordSummaries();

    expect(first).toEqual([{ id: "capture-1", setupFamilyId: "breakout" }]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSharedClientTtlCache().get(PATTERN_LIBRARY_RECORDS_CACHE_KEY)).toEqual(first);
  });

  it("invalidates cached summaries after mutation hook", async () => {
    const fetchMock = vi.fn(async () => Response.json({ records: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPatternLibraryRecordSummaries();
    invalidatePatternLibraryRecordsCache();
    await fetchPatternLibraryRecordSummaries();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
