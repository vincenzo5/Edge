import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDefaultUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getUserPreferencesLibrary: vi.fn(async () => null),
  createUserPreferencesLibrary: vi.fn(async () => ({
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    preferencesSnapshot: createDefaultUserPreferencesSnapshot(),
  })),
  saveUserPreferencesLibrary: vi.fn(async () => ({
    ok: true as const,
    record: {
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      preferencesSnapshot: createDefaultUserPreferencesSnapshot(),
    },
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/userPreferencesRepository", () => ({
  getUserPreferencesLibrary: mocks.getUserPreferencesLibrary,
  createUserPreferencesLibrary: mocks.createUserPreferencesLibrary,
  saveUserPreferencesLibrary: mocks.saveUserPreferencesLibrary,
}));

describe("/api/me/user-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("creates a default user preferences library on first GET", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.createUserPreferencesLibrary).toHaveBeenCalledTimes(1);
    expect(mocks.createUserPreferencesLibrary).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        schemaVersion: 1,
        theme: expect.any(String),
      }),
    );
  });

  it("rejects invalid PUT payloads", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("saves a valid user preferences snapshot", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          preferencesSnapshot: createDefaultUserPreferencesSnapshot(),
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.syncRevision).toBe(2);
  });
});
