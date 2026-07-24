import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { clearSharedClientTtlCacheForTests } from "@/lib/marketData/cache/clientTtlCache";
import { resetClientTtlFetchCoalesceForTests } from "@/lib/marketData/cache/getOrFetchClientTtl";
import { fetchSymbolSearch } from "./searchClient";

describe("fetchSymbolSearch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearSharedClientTtlCacheForTests();
    resetClientTtlFetchCoalesceForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("caches normalized query within TTL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" }],
      }),
    });

    const first = await fetchSymbolSearch("  Aapl ");
    const second = await fetchSymbolSearch("aapl");

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "Aapl", limit: 8 }),
      }),
    );
  });
});
