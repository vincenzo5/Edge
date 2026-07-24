import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDefaultUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  saveUserPreferencesLibrary: vi.fn(async () => ({
    ok: false as const,
    code: "conflict" as const,
    current: {
      schemaVersion: 1 as const,
      syncRevision: 3,
      updatedAt: "2026-01-03T00:00:00.000Z",
      preferencesSnapshot: {
        ...createDefaultUserPreferencesSnapshot(),
        theme: "light" as const,
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

vi.mock("@/lib/persistence/repositories/userPreferencesRepository", () => ({
  getUserPreferencesLibrary: vi.fn(),
  createUserPreferencesLibrary: vi.fn(),
  saveUserPreferencesLibrary: mocks.saveUserPreferencesLibrary,
}));

describe("/api/me/user-preferences PUT conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current preferences snapshot on revision conflict", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/user-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 2,
          preferencesSnapshot: createDefaultUserPreferencesSnapshot(),
        }),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.current.syncRevision).toBe(3);
    expect(json.current.preferencesSnapshot.theme).toBe("light");
  });
});
