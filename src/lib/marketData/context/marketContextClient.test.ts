import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { clearSharedClientTtlCacheForTests } from "@/lib/marketData/cache/clientTtlCache";
import { resetClientTtlFetchCoalesceForTests } from "@/lib/marketData/cache/getOrFetchClientTtl";
import { fetchMarketContext } from "./marketContextClient";

describe("fetchMarketContext", () => {
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

  it("uses client TTL cache on repeat symbol", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        context: { symbol: "AAPL", exchange: "NASDAQ", classification: "Large Cap" },
      }),
    });

    const first = await fetchMarketContext("aapl");
    const second = await fetchMarketContext("AAPL");

    expect(first.symbol).toBe("AAPL");
    expect(second.symbol).toBe("AAPL");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/market-data/context?symbol=AAPL");
  });
});
