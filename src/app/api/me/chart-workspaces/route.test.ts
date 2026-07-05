import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  listChartWorkspaces: vi.fn(async () => [
    {
      id: "workspace-1",
      workspaceName: "Default",
      schemaVersion: 1 as const,
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      isDefault: true,
      chartLayoutSnapshot: DEFAULT_LAYOUT,
    },
  ]),
  createChartWorkspace: vi.fn(async () => ({
    id: "workspace-2",
    workspaceName: "Tech",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-02T00:00:00.000Z",
    chartLayoutSnapshot: DEFAULT_LAYOUT,
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/chartWorkspaceRepository", () => ({
  listChartWorkspaces: mocks.listChartWorkspaces,
  createChartWorkspace: mocks.createChartWorkspace,
}));

describe("/api/me/chart-workspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists workspaces for the authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.listChartWorkspaces).toHaveBeenCalledWith("user-1");
    const json = await res.json();
    expect(json.workspaces).toHaveLength(1);
    expect(json.workspaces[0].id).toBe("workspace-1");
  });

  it("POST creates a non-default workspace", async () => {
    const res = await POST(
      new Request("http://localhost/api/me/chart-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          workspaceName: "Tech",
          chartLayoutSnapshot: DEFAULT_LAYOUT,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.createChartWorkspace).toHaveBeenCalledWith(
      "user-1",
      DEFAULT_LAYOUT,
      "Tech",
      false,
    );
    const json = await res.json();
    expect(json.id).toBe("workspace-2");
  });
});
