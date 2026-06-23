import { describe, expect, it, vi, beforeEach } from "vitest";

import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getWatchlistLibrary: vi.fn(async () => null),
  createWatchlistLibrary: vi.fn(async () => ({
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    watchlistSnapshot: DEFAULT_WATCHLIST_STATE,
  })),
  saveWatchlistLibrary: vi.fn(async () => ({
    ok: true as const,
    record: {
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      watchlistSnapshot: DEFAULT_WATCHLIST_STATE,
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
  getWatchlistLibrary: mocks.getWatchlistLibrary,
  createWatchlistLibrary: mocks.createWatchlistLibrary,
  saveWatchlistLibrary: mocks.saveWatchlistLibrary,
}));

describe("/api/me/watchlist-library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("creates a default watchlist library on first GET", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.createWatchlistLibrary).toHaveBeenCalledWith("user-1", DEFAULT_WATCHLIST_STATE);
  });

  it("rejects invalid PUT payloads", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/watchlist-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("saves a valid watchlist snapshot", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/watchlist-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          watchlistSnapshot: DEFAULT_WATCHLIST_STATE,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.syncRevision).toBe(2);
  });
});
