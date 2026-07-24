import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { clearSharedClientTtlCacheForTests } from "@/lib/marketData/cache/clientTtlCache";
import { resetClientTtlFetchCoalesceForTests } from "@/lib/marketData/cache/getOrFetchClientTtl";
import { fetchFundamentals, fetchFundamentalsBatch } from "./fundamentalsClient";

describe("fundamentalsClient", () => {
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

  it("fetchFundamentals uses GET single-symbol route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ symbol: "AAPL", longName: "Apple Inc." }),
    });

    const result = await fetchFundamentals("AAPL");
    expect(result.symbol).toBe("AAPL");
    expect(fetchMock).toHaveBeenCalledWith("/api/fundamentals?symbol=AAPL");
  });

  it("fetchFundamentalsBatch uses POST batch route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bySymbol: {
          AAPL: { symbol: "AAPL", longName: "Apple Inc." },
          MSFT: { symbol: "MSFT", longName: "Microsoft Corp." },
        },
        errors: {},
      }),
    });

    const result = await fetchFundamentalsBatch(["AAPL", "MSFT"]);
    expect(Object.keys(result)).toEqual(["AAPL", "MSFT"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/fundamentals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ symbols: ["AAPL", "MSFT"] }),
      }),
    );
  });

  it("coalesces identical in-flight batch requests", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = fetchFundamentalsBatch(["AAPL", "MSFT"]);
    const second = fetchFundamentalsBatch(["MSFT", "AAPL"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: async () => ({
        bySymbol: { AAPL: { symbol: "AAPL" }, MSFT: { symbol: "MSFT" } },
        errors: {},
      }),
    });

    await expect(first).resolves.toEqual({
      AAPL: { symbol: "AAPL" },
      MSFT: { symbol: "MSFT" },
    });
    await expect(second).resolves.toEqual({
      AAPL: { symbol: "AAPL" },
      MSFT: { symbol: "MSFT" },
    });
  });

  it("reuses per-symbol cache on batch remount without network", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bySymbol: {
          AAPL: { symbol: "AAPL", longName: "Apple Inc." },
          MSFT: { symbol: "MSFT", longName: "Microsoft Corp." },
        },
        errors: {},
      }),
    });

    await fetchFundamentalsBatch(["AAPL", "MSFT"]);
    fetchMock.mockClear();

    const cached = await fetchFundamentalsBatch(["MSFT", "AAPL"]);
    expect(Object.keys(cached).sort()).toEqual(["AAPL", "MSFT"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchFundamentals single GET hits shared per-symbol cache", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ symbol: "AAPL", longName: "Apple Inc." }),
    });

    await fetchFundamentals("AAPL");
    fetchMock.mockClear();

    const cached = await fetchFundamentals("aapl");
    expect(cached.symbol).toBe("AAPL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
