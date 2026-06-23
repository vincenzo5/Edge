import { describe, expect, it, vi, beforeEach } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { PUT } from "../[id]/route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getChartWorkspaceById: vi.fn(async () => ({
    id: "workspace-1",
    workspaceName: "Default",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    chartLayoutSnapshot: DEFAULT_LAYOUT,
  })),
  saveChartWorkspace: vi.fn(async () => ({
    ok: false as const,
    code: "conflict" as const,
    current: {
      id: "workspace-1",
      workspaceName: "Default",
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      chartLayoutSnapshot: {
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0], symbol: "MSFT" }],
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

vi.mock("@/lib/persistence/repositories/chartWorkspaceRepository", () => ({
  getChartWorkspaceById: mocks.getChartWorkspaceById,
  saveChartWorkspace: mocks.saveChartWorkspace,
}));

describe("/api/me/chart-workspaces/[id] PUT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 on revision conflict", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/chart-workspaces/workspace-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          chartLayoutSnapshot: DEFAULT_LAYOUT,
        }),
      }),
      { params: Promise.resolve({ id: "workspace-1" }) },
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("conflict");
    expect(json.current.syncRevision).toBe(2);
    expect(json.current.chartLayoutSnapshot.cells[0].symbol).toBe("MSFT");
  });
});
