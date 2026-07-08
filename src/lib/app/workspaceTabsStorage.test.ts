import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  clearWorkspaceTabs,
  DISMISSED_REMOTE_WORKSPACES_KEY,
  hasPersistedWorkspaceTabs,
  loadDismissedRemoteWorkspaceIds,
  loadWorkspaceTabs,
  migrateLayoutToWorkspaceTabs,
  recordDismissedRemoteWorkspace,
  saveWorkspaceTabs,
  WORKSPACE_TABS_STORAGE_KEY,
} from "./workspaceTabsStorage";
import { createDefaultWorkspaceTabs } from "./workspaceTabs";

const LEGACY_LAYOUT_KEY = "tv-ai:layout:v1";
const LEGACY_SYNC_KEY = "tv-ai:sync:chart-workspace:v1";

describe("workspaceTabsStorage", () => {
  beforeEach(() => {
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
    clearWorkspaceTabs();
    localStorage.removeItem(LEGACY_LAYOUT_KEY);
    localStorage.removeItem(LEGACY_SYNC_KEY);
  });

  it("migrates legacy layout into default tab", () => {
    const layout = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "TSLA" }],
    };
    localStorage.setItem(LEGACY_LAYOUT_KEY, JSON.stringify(layout));
    localStorage.setItem(
      LEGACY_SYNC_KEY,
      JSON.stringify({
        resourceId: "remote-1",
        syncRevision: 3,
        updatedAt: "2026-07-04T00:00:00.000Z",
      }),
    );

    const tabs = loadWorkspaceTabs();
    expect(tabs.tabs).toHaveLength(1);
    expect(tabs.tabs[0]?.layout.cells[0]?.symbol).toBe("TSLA");
    expect(tabs.tabs[0]?.remote).toEqual({
      resourceId: "remote-1",
      syncRevision: 3,
      updatedAt: "2026-07-04T00:00:00.000Z",
    });
  });

  it("round-trips workspace tabs storage", () => {
    const state = createDefaultWorkspaceTabs();
    saveWorkspaceTabs(state);

    const loaded = loadWorkspaceTabs();
    expect(loaded).toEqual(state);
    expect(localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY)).toBeTruthy();
  });

  it("detects persisted workspace tabs in localStorage", () => {
    expect(hasPersistedWorkspaceTabs()).toBe(false);
    saveWorkspaceTabs(createDefaultWorkspaceTabs());
    expect(hasPersistedWorkspaceTabs()).toBe(true);
  });

  it("tracks dismissed remote workspaces locally", () => {
    recordDismissedRemoteWorkspace("ws-closed");
    expect(loadDismissedRemoteWorkspaceIds()).toEqual(new Set(["ws-closed"]));
    expect(localStorage.getItem(DISMISSED_REMOTE_WORKSPACES_KEY)).toContain("ws-closed");
  });

  it("falls back to default when storage invalid", () => {
    localStorage.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify({ version: 2 }));
    const tabs = loadWorkspaceTabs();
    expect(tabs.tabs).toHaveLength(1);
    expect(tabs.tabs[0]?.title).toBe("Default");
  });

  it("migrateLayoutToWorkspaceTabs binds remote metadata", () => {
    localStorage.setItem(
      LEGACY_SYNC_KEY,
      JSON.stringify({
        resourceId: "ws-abc",
        syncRevision: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    const tabs = migrateLayoutToWorkspaceTabs(DEFAULT_LAYOUT);
    expect(tabs.tabs[0]?.remote?.resourceId).toBe("ws-abc");
  });
});
