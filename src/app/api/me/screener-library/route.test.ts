import { describe, expect, it, vi, beforeEach } from "vitest";

import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getScreenerLibrary: vi.fn(async () => null),
  createScreenerLibrary: vi.fn(async () => ({
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    screenerSnapshot: DEFAULT_SCREENER_STATE,
  })),
  saveScreenerLibrary: vi.fn(async () => ({
    ok: true as const,
    record: {
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      screenerSnapshot: DEFAULT_SCREENER_STATE,
    },
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/screenerLibraryRepository", () => ({
  getScreenerLibrary: mocks.getScreenerLibrary,
  createScreenerLibrary: mocks.createScreenerLibrary,
  saveScreenerLibrary: mocks.saveScreenerLibrary,
}));

describe("/api/me/screener-library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("creates a default screener library on first GET", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.createScreenerLibrary).toHaveBeenCalledWith("user-1", DEFAULT_SCREENER_STATE);
  });

  it("rejects invalid PUT payloads", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/screener-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("saves a valid screener snapshot", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/screener-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          screenerSnapshot: DEFAULT_SCREENER_STATE,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.syncRevision).toBe(2);
  });
});
