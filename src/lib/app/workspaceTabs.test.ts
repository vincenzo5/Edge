import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  closeTab,
  createDefaultWorkspaceTabs,
  createTab,
  createWorkspaceTabId,
  getActiveLayout,
  getActiveTab,
  getTabPrimarySymbol,
  MAX_WORKSPACE_TABS,
  mergeRemoteWorkspaces,
  renameTab,
  resetWorkspaceTabIdCounterForTests,
  switchTab,
  updateActiveTabLayout,
  updateTabRemote,
} from "./workspaceTabs";

describe("workspaceTabs", () => {
  beforeEach(() => {
    resetWorkspaceTabIdCounterForTests();
  });

  it("creates default state with one tab", () => {
    const state = createDefaultWorkspaceTabs();
    expect(state.version).toBe(1);
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0]!.id);
    expect(getActiveTab(state).title).toBe("Default");
    expect(getActiveLayout(state)).toEqual(DEFAULT_LAYOUT);
  });

  it("switches active tab", () => {
    let state = createDefaultWorkspaceTabs();
    state = createTab(state, { title: "Second", id: "tab-2" });
    const firstId = state.tabs[0]!.id;

    state = switchTab(state, firstId);
    expect(state.activeTabId).toBe(firstId);

    state = switchTab(state, "missing");
    expect(state.activeTabId).toBe(firstId);
  });

  it("creates tab and activates it", () => {
    const state = createTab(createDefaultWorkspaceTabs(), {
      title: "Tech",
      layout: {
        ...DEFAULT_LAYOUT,
        cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
      },
    });

    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe(state.tabs[1]!.id);
    expect(getActiveLayout(state).cells[0]?.symbol).toBe("NVDA");
  });

  it("enforces max tab cap", () => {
    let state = createDefaultWorkspaceTabs();
    for (let i = 0; i < MAX_WORKSPACE_TABS; i += 1) {
      state = createTab(state, { id: `tab-${i + 2}` });
    }
    expect(state.tabs).toHaveLength(MAX_WORKSPACE_TABS);

    const before = state;
    state = createTab(state, { id: "overflow" });
    expect(state).toBe(before);
  });

  it("closes tab but keeps at least one", () => {
    const state = createDefaultWorkspaceTabs();
    expect(closeTab(state, state.tabs[0]!.id)).toBe(state);
  });

  it("closes non-active tab", () => {
    let state = createDefaultWorkspaceTabs();
    state = createTab(state, { id: "tab-2", title: "Second" });
    const firstId = state.tabs[0]!.id;
    state = switchTab(state, firstId);

    state = closeTab(state, "tab-2");
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(firstId);
  });

  it("closes active tab and selects neighbor", () => {
    let state = createDefaultWorkspaceTabs();
    state = createTab(state, { id: "tab-2" });
    state = closeTab(state, state.activeTabId);
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0]!.id);
  });

  it("renames tab", () => {
    const state = createDefaultWorkspaceTabs();
    const id = state.tabs[0]!.id;
    const renamed = renameTab(state, id, "  My Layout  ");
    expect(getActiveTab(renamed).title).toBe("My Layout");
    expect(renameTab(state, id, "   ")).toBe(state);
  });

  it("updates active tab layout", () => {
    const updated = updateActiveTabLayout(createDefaultWorkspaceTabs(), (prev) => ({
      ...prev,
      theme: "light",
    }));
    expect(getActiveLayout(updated).theme).toBe("light");
  });

  it("returns primary symbol from active cell", () => {
    const state = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      activeCellIndex: 0,
      layoutId: "n2-rows",
      cells: [
        { ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" },
        { ...DEFAULT_LAYOUT.cells[0]!, symbol: "GOOG" },
      ],
    });
    expect(getTabPrimarySymbol(state.tabs[0]!)).toBe("MSFT");

    const activeSecond = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      activeCellIndex: 1,
      layoutId: "n2-rows",
      cells: [
        { ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" },
        { ...DEFAULT_LAYOUT.cells[0]!, symbol: "GOOG" },
      ],
    });
    expect(getTabPrimarySymbol(activeSecond.tabs[0]!)).toBe("GOOG");
  });

  it("updates tab remote metadata", () => {
    const state = createDefaultWorkspaceTabs();
    const id = state.tabs[0]!.id;
    const withRemote = updateTabRemote(state, id, {
      resourceId: "ws-1",
      syncRevision: 1,
      updatedAt: "2026-07-04T00:00:00.000Z",
    });
    expect(withRemote.tabs[0]?.remote?.resourceId).toBe("ws-1");

    const cleared = updateTabRemote(withRemote, id, undefined);
    expect(cleared.tabs[0]?.remote).toBeUndefined();
  });

  it("mergeRemoteWorkspaces updates linked tab when remote is newer", () => {
    const local = createDefaultWorkspaceTabs(DEFAULT_LAYOUT, {
      resourceId: "ws-1",
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const { state, changed } = mergeRemoteWorkspaces(local, [
      {
        id: "ws-1",
        workspaceName: "Default",
        schemaVersion: 1,
        syncRevision: 2,
        updatedAt: "2026-07-04T00:00:00.000Z",
        isDefault: true,
        chartLayoutSnapshot: {
          ...DEFAULT_LAYOUT,
          cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "GOOG" }],
        },
      },
    ]);

    expect(changed).toBe(true);
    expect(state.tabs[0]?.layout.cells[0]?.symbol).toBe("GOOG");
  });

  it("generates unique tab ids", () => {
    resetWorkspaceTabIdCounterForTests();
    const originalUuid = globalThis.crypto?.randomUUID;
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: undefined },
      configurable: true,
    });
    expect(createWorkspaceTabId()).toBe("tab-1");
    expect(createWorkspaceTabId()).toBe("tab-2");
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: originalUuid },
      configurable: true,
    });
  });
});
