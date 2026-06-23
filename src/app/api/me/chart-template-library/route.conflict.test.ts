import { describe, expect, it, vi, beforeEach } from "vitest";

import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  saveChartTemplateLibrary: vi.fn(async () => ({
    ok: false as const,
    code: "conflict" as const,
    current: {
      schemaVersion: 1 as const,
      syncRevision: 4,
      updatedAt: "2026-01-04T00:00:00.000Z",
      templateSnapshot: {
        version: 1 as const,
        presets: [{ id: "preset-1", name: "Remote Template", version: 1 }],
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

vi.mock("@/lib/persistence/repositories/chartTemplateLibraryRepository", () => ({
  getChartTemplateLibrary: vi.fn(),
  createChartTemplateLibrary: vi.fn(),
  saveChartTemplateLibrary: mocks.saveChartTemplateLibrary,
}));

describe("/api/me/chart-template-library PUT conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current template snapshot on revision conflict", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/chart-template-library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 3,
          templateSnapshot: { version: 1, presets: [] },
        }),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.current.syncRevision).toBe(4);
    expect(json.current.templateSnapshot.presets[0].name).toBe("Remote Template");
  });
});
