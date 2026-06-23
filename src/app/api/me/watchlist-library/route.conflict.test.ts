import { describe, expect, it, vi, beforeEach } from "vitest";

import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  saveWatchlistLibrary: vi.fn(async () => ({
    ok: false as const,
    code: "conflict" as const,
    current: {
      schemaVersion: 1 as const,
      syncRevision: 3,
      updatedAt: "2026-01-03T00:00:00.000Z",
      watchlistSnapshot: {
        ...DEFAULT_WATCHLIST_STATE,
        watchlists: [{ ...DEFAULT_WATCHLIST_STATE.watchlists[0], name: "Remote List" }],
      },
    },
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/watchlistLibraryRepository", () => ({
  getWatchlistLibrary: vi.fn(),
  createWatchlistLibrary: vi.fn(),
  saveWatchlistLibrary: mocks.saveWatchlistLibrary,
}));

describe("/api/me/watchlist-library PUT conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current watchlist snapshot on revision conflict", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/watchlist-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 2,
          watchlistSnapshot: DEFAULT_WATCHLIST_STATE,
        }),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.current.syncRevision).toBe(3);
    expect(json.current.watchlistSnapshot.watchlists[0].name).toBe("Remote List");
  });
});
