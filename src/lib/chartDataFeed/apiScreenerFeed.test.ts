import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchScreenerResults, fetchMarketMoverResults } from "./apiScreenerFeed";

describe("apiScreenerFeed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchScreenerResults posts query and parses envelope", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ symbol: "AAPL", name: "Apple Inc." }],
          meta: { source: "fmp", warnings: [], stale: false },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchScreenerResults({ sector: "Technology", limit: 25 });
    expect(result.rows[0]?.symbol).toBe("AAPL");
    expect(result.meta.source).toBe("fmp");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/screener/run",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetchMarketMoverResults maps movers into screener rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          movers: [
            {
              symbol: "NVDA",
              name: "NVIDIA",
              price: 100,
              change: 1,
              changePercent: 1,
              exchange: "NASDAQ",
              volume: 1000,
              sector: "Technology",
              marketCap: 3_000_000_000_000,
            },
          ],
          meta: { source: "fmp", warnings: [], stale: false },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchMarketMoverResults({ kind: "gainers", limit: 10 });
    expect(result.rows[0]?.symbol).toBe("NVDA");
    expect(result.rows[0]?.sector).toBe("Technology");
    expect(result.rows[0]?.marketCap).toBe(3_000_000_000_000);
  });

  it("throws on non-OK screener response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "bad query" }), { status: 400 }),
    );
    await expect(fetchScreenerResults({ limit: 10 })).rejects.toThrow("bad query");
  });
});
