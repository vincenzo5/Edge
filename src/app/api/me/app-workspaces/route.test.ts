import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDefaultWorkspacesState } from "@/lib/appWorkspace/storage";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getAppWorkspacesLibrary: vi.fn(async () => null),
  createAppWorkspacesLibrary: vi.fn(async () => ({
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    appWorkspacesSnapshot: createDefaultWorkspacesState(),
  })),
  saveAppWorkspacesLibrary: vi.fn(async () => ({
    ok: true as const,
    record: {
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      appWorkspacesSnapshot: createDefaultWorkspacesState(),
    },
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/appWorkspacesRepository", () => ({
  getAppWorkspacesLibrary: mocks.getAppWorkspacesLibrary,
  createAppWorkspacesLibrary: mocks.createAppWorkspacesLibrary,
  saveAppWorkspacesLibrary: mocks.saveAppWorkspacesLibrary,
}));

describe("/api/me/app-workspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("creates a default app workspaces library on first GET", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.createAppWorkspacesLibrary).toHaveBeenCalledTimes(1);
    expect(mocks.createAppWorkspacesLibrary).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        version: 1,
        documents: expect.arrayContaining([
          expect.objectContaining({ name: "Default", version: 1 }),
        ]),
      }),
    );
  });

  it("rejects invalid PUT payloads", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/app-workspaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaVersion: 1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("saves a valid app workspaces snapshot", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/app-workspaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          appWorkspacesSnapshot: createDefaultWorkspacesState(),
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.syncRevision).toBe(2);
  });
});
