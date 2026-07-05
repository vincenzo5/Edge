import { describe, expect, it, vi } from "vitest";

import {
  archiveChartWorkspace,
  createChartWorkspace,
  listChartWorkspaces,
} from "./chartWorkspaceRepository";

const mockRows = vi.hoisted(() => ({
  workspaces: [] as Array<{
    id: string;
    userId: string;
    workspaceName: string;
    schemaVersion: number;
    chartLayoutSnapshot: unknown;
    syncRevision: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  }>,
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => mockRows.workspaces.filter((w) => !w.archivedAt),
          limit: (n: number) => mockRows.workspaces.filter((w) => !w.archivedAt).slice(0, n),
        }),
      }),
    }),
    insert: () => ({
      values: (row: (typeof mockRows.workspaces)[number]) => ({
        returning: () => {
          const created = {
            ...row,
            id: row.id ?? "new-id",
            createdAt: new Date(),
            updatedAt: new Date(),
            archivedAt: null,
          };
          mockRows.workspaces.push(created);
          return [created];
        },
      }),
    }),
    update: () => ({
      set: (patch: Partial<(typeof mockRows.workspaces)[number]>) => ({
        where: () => {
          const target = mockRows.workspaces.find((w) => !w.archivedAt);
          if (target) Object.assign(target, patch);
          return Promise.resolve();
        },
      }),
    }),
  }),
}));

describe("chartWorkspaceRepository workspace tabs helpers", () => {
  it("listChartWorkspaces returns non-archived rows", async () => {
    mockRows.workspaces = [
      {
        id: "ws-1",
        userId: "user-1",
        workspaceName: "Default",
        schemaVersion: 1,
        chartLayoutSnapshot: { version: 1 },
        syncRevision: 1,
        isDefault: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        archivedAt: null,
      },
    ];

    const list = await listChartWorkspaces("user-1");
    expect(list).toHaveLength(1);
    expect(list[0]?.workspaceName).toBe("Default");
    expect(list[0]?.isDefault).toBe(true);
  });

  it("createChartWorkspace inserts a workspace record", async () => {
    mockRows.workspaces = [];
    const created = await createChartWorkspace(
      "user-1",
      { version: 1 } as never,
      "Second",
      false,
    );
    expect(created.workspaceName).toBe("Second");
    expect(mockRows.workspaces).toHaveLength(1);
  });

  it("archiveChartWorkspace rejects last workspace", async () => {
    mockRows.workspaces = [
      {
        id: "ws-1",
        userId: "user-1",
        workspaceName: "Default",
        schemaVersion: 1,
        chartLayoutSnapshot: { version: 1 },
        syncRevision: 1,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
    ];

    const result = await archiveChartWorkspace("user-1", "ws-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("default_required");
  });
});
