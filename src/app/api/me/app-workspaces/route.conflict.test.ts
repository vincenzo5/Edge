import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDefaultWorkspacesState } from "@/lib/appWorkspace/storage";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  saveAppWorkspacesLibrary: vi.fn(async () => ({
    ok: false as const,
    code: "conflict" as const,
    current: {
      schemaVersion: 1 as const,
      syncRevision: 3,
      updatedAt: "2026-01-03T00:00:00.000Z",
      appWorkspacesSnapshot: {
        ...createDefaultWorkspacesState(),
        documents: [
          {
            ...createDefaultWorkspacesState().documents[0]!,
            name: "Remote Desk",
          },
        ],
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

vi.mock("@/lib/persistence/repositories/appWorkspacesRepository", () => ({
  getAppWorkspacesLibrary: vi.fn(),
  createAppWorkspacesLibrary: vi.fn(),
  saveAppWorkspacesLibrary: mocks.saveAppWorkspacesLibrary,
}));

describe("/api/me/app-workspaces PUT conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current app workspaces snapshot on revision conflict", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/app-workspaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 2,
          appWorkspacesSnapshot: createDefaultWorkspacesState(),
        }),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.current.syncRevision).toBe(3);
    expect(json.current.appWorkspacesSnapshot.documents[0]?.name).toBe("Remote Desk");
  });
});
