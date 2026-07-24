import { describe, expect, it, vi } from "vitest";

import { chunkSymbols } from "./resolveAlertSymbols";

vi.mock("@/lib/persistence/repositories/watchlistLibraryRepository", () => ({
  getWatchlistLibrary: vi.fn(),
}));

import { getWatchlistLibrary } from "@/lib/persistence/repositories/watchlistLibraryRepository";
import { resolveAlertSymbols } from "./resolveAlertSymbols";

describe("chunkSymbols", () => {
  it("splits symbols into fixed-size chunks", () => {
    const symbols = Array.from({ length: 55 }, (_, i) => `S${i}`);
    const chunks = chunkSymbols(symbols, 50);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[1]).toHaveLength(5);
  });
});

describe("resolveAlertSymbols", () => {
  it("returns single symbol when watchlist is not set", async () => {
    const scope = await resolveAlertSymbols({
      userId: "user-1",
      symbol: "aapl",
    });
    expect(scope.symbols).toEqual(["AAPL"]);
  });

  it("expands watchlist symbols from library snapshot", async () => {
    vi.mocked(getWatchlistLibrary).mockResolvedValue({
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: new Date().toISOString(),
      watchlistSnapshot: {
        version: 1,
        activeWatchlistId: "wl-1",
        selectedSymbol: "SPY",
        watchlists: [
          {
            id: "wl-1",
            name: "Leaders",
            items: [{ symbol: "SPY", addedAt: "2026-01-01T00:00:00.000Z" }],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "wl-2",
            name: "Tech",
            items: [
              { symbol: "AAPL", addedAt: "2026-01-01T00:00:00.000Z" },
              { symbol: "NVDA", addedAt: "2026-01-01T00:00:00.000Z" },
            ],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    const scope = await resolveAlertSymbols({
      userId: "user-1",
      symbol: "*",
      watchlistId: "wl-2",
    });

    expect(scope.symbols).toEqual(["AAPL", "NVDA"]);
    expect(scope.watchlistName).toBe("Tech");
  });

  it("skips when watchlist library is unavailable", async () => {
    vi.mocked(getWatchlistLibrary).mockResolvedValue(null);
    const scope = await resolveAlertSymbols({
      userId: "user-1",
      symbol: "*",
      watchlistId: "wl-1",
    });
    expect(scope.skippedReason).toBe("watchlist_unavailable");
    expect(scope.symbols).toEqual([]);
  });
});
