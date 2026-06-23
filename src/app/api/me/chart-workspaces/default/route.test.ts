import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getOrCreateDefaultChartWorkspace: vi.fn(async () => ({
    id: "workspace-1",
    workspaceName: "Default",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
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
  getOrCreateDefaultChartWorkspace: mocks.getOrCreateDefaultChartWorkspace,
}));

describe("/api/me/chart-workspaces/default GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the atomic default workspace bootstrap result", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.getOrCreateDefaultChartWorkspace).toHaveBeenCalledWith("user-1", DEFAULT_LAYOUT);
    const json = await res.json();
    expect(json.id).toBe("workspace-1");
  });
});
