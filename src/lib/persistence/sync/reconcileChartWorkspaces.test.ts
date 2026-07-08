import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultWorkspaceTabs, createTab } from "@/lib/app/workspaceTabs";
import { DISMISSED_REMOTE_WORKSPACES_KEY } from "@/lib/app/workspaceTabsStorage";

const mocks = vi.hoisted(() => ({
  fetchChartWorkspaces: vi.fn(),
  archiveChartWorkspaceRemote: vi.fn(),
}));

vi.mock("@/lib/persistence/client/chartWorkspaceClient", () => ({
  fetchChartWorkspaces: mocks.fetchChartWorkspaces,
  archiveChartWorkspaceRemote: mocks.archiveChartWorkspaceRemote,
}));

import { reconcileChartWorkspacesAfterTabClose } from "./reconcileChartWorkspaces";

describe("reconcileChartWorkspacesAfterTabClose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    mocks.archiveChartWorkspaceRemote.mockResolvedValue(true);
  });

  it("archives the closed workspace and stray server rows not linked to remaining tabs", async () => {
    let tabs = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: "ws-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    tabs = createTab(tabs, {
      id: "tab-2",
      title: "Tech",
      remote: {
        resourceId: "ws-2",
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    mocks.fetchChartWorkspaces.mockResolvedValue([
      {
        id: "ws-1",
        workspaceName: "Default",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        isDefault: true,
        chartLayoutSnapshot: DEFAULT_LAYOUT,
      },
      {
        id: "ws-2",
        workspaceName: "Tech",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-01-02T00:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: DEFAULT_LAYOUT,
      },
      {
        id: "ws-3",
        workspaceName: "AAPL",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-01-03T00:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: DEFAULT_LAYOUT,
      },
    ]);

    const remaining = {
      ...tabs,
      tabs: [tabs.tabs[0]!],
      activeTabId: tabs.tabs[0]!.id,
    };

    const result = await reconcileChartWorkspacesAfterTabClose(remaining, "ws-2");

    expect(result.archived.sort()).toEqual(["ws-2", "ws-3"]);
    expect(result.failed).toEqual([]);
    expect(mocks.archiveChartWorkspaceRemote).toHaveBeenCalledWith("ws-2");
    expect(mocks.archiveChartWorkspaceRemote).toHaveBeenCalledWith("ws-3");
    expect(localStorage.getItem(DISMISSED_REMOTE_WORKSPACES_KEY)).toContain("ws-2");
    expect(localStorage.getItem(DISMISSED_REMOTE_WORKSPACES_KEY)).toContain("ws-3");
  });

  it("keeps a default server workspace when the remaining tab is not linked yet", async () => {
    const remaining = createDefaultWorkspaceTabs();

    mocks.fetchChartWorkspaces.mockResolvedValue([
      {
        id: "ws-1",
        workspaceName: "Default",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        isDefault: true,
        chartLayoutSnapshot: DEFAULT_LAYOUT,
      },
      {
        id: "ws-2",
        workspaceName: "AAPL",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-01-02T00:00:00.000Z",
        isDefault: false,
        chartLayoutSnapshot: DEFAULT_LAYOUT,
      },
    ]);

    const result = await reconcileChartWorkspacesAfterTabClose(remaining, "ws-2");

    expect(result.archived).toEqual(["ws-2"]);
    expect(mocks.archiveChartWorkspaceRemote).toHaveBeenCalledWith("ws-2");
    expect(mocks.archiveChartWorkspaceRemote).not.toHaveBeenCalledWith("ws-1");
  });
});
