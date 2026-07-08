import {
  cellCountFor,
  DEFAULT_LAYOUT,
  type ChartLayout,
} from "@/lib/chartConfig";
import { isRemoteNewer } from "@/lib/persistence/sync/syncMetadata";
import type { ChartWorkspaceRemoteSummary } from "@/lib/persistence/client/chartWorkspaceClient";

export const MAX_WORKSPACE_TABS = 12;

export type WorkspaceTabRemote = {
  resourceId: string;
  syncRevision: number;
  updatedAt: string;
};

export type WorkspaceTab = {
  id: string;
  title: string;
  layout: ChartLayout;
  remote?: WorkspaceTabRemote;
};

export type WorkspaceTabsState = {
  version: 1;
  activeTabId: string;
  tabs: WorkspaceTab[];
};

export type CreateTabOptions = {
  title?: string;
  layout?: ChartLayout;
  remote?: WorkspaceTabRemote;
  id?: string;
};

let tabIdCounter = 0;

/** Deterministic id for tests; production uses crypto.randomUUID when available. */
export function createWorkspaceTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  tabIdCounter += 1;
  return `tab-${tabIdCounter}`;
}

/** Reset counter for unit tests only. */
export function resetWorkspaceTabIdCounterForTests(): void {
  tabIdCounter = 0;
}

export function createDefaultWorkspaceTabs(
  layout: ChartLayout = DEFAULT_LAYOUT,
  remote?: WorkspaceTabRemote,
): WorkspaceTabsState {
  const id = createWorkspaceTabId();
  return {
    version: 1,
    activeTabId: id,
    tabs: [
      {
        id,
        title: "Default",
        layout,
        ...(remote ? { remote } : {}),
      },
    ],
  };
}

export function getActiveTab(state: WorkspaceTabsState): WorkspaceTab {
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!tab) {
    return state.tabs[0]!;
  }
  return tab;
}

export function getActiveLayout(state: WorkspaceTabsState): ChartLayout {
  return getActiveTab(state).layout;
}

export function getTabPrimarySymbol(tab: WorkspaceTab): string {
  const index = tab.layout.activeCellIndex ?? 0;
  const count = cellCountFor(tab.layout.layoutId);
  const cell = tab.layout.cells[Math.min(index, count - 1)];
  return cell?.symbol ?? tab.layout.cells[0]?.symbol ?? "AAPL";
}

export function switchTab(state: WorkspaceTabsState, tabId: string): WorkspaceTabsState {
  if (state.activeTabId === tabId) return state;
  if (!state.tabs.some((t) => t.id === tabId)) return state;
  return { ...state, activeTabId: tabId };
}

export function createTab(
  state: WorkspaceTabsState,
  options: CreateTabOptions = {},
): WorkspaceTabsState {
  if (state.tabs.length >= MAX_WORKSPACE_TABS) return state;

  const id = options.id ?? createWorkspaceTabId();
  const tab: WorkspaceTab = {
    id,
    title: options.title ?? `Layout ${state.tabs.length + 1}`,
    layout: structuredClone(options.layout ?? DEFAULT_LAYOUT),
    ...(options.remote ? { remote: options.remote } : {}),
  };

  return {
    version: 1,
    activeTabId: id,
    tabs: [...state.tabs, tab],
  };
}

export function closeTab(state: WorkspaceTabsState, tabId: string): WorkspaceTabsState {
  if (state.tabs.length <= 1) return state;
  if (!state.tabs.some((t) => t.id === tabId)) return state;

  const tabs = state.tabs.filter((t) => t.id !== tabId);
  let activeTabId = state.activeTabId;
  if (activeTabId === tabId) {
    const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
    const nextIndex = Math.min(closedIndex, tabs.length - 1);
    activeTabId = tabs[nextIndex]!.id;
  }

  return { version: 1, activeTabId, tabs };
}

export function renameTab(
  state: WorkspaceTabsState,
  tabId: string,
  title: string,
): WorkspaceTabsState {
  const trimmed = title.trim();
  if (!trimmed) return state;
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title: trimmed } : t)),
  };
}

export function updateTabLayout(
  state: WorkspaceTabsState,
  tabId: string,
  layout: ChartLayout,
): WorkspaceTabsState {
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, layout } : t)),
  };
}

export function updateActiveTabLayout(
  state: WorkspaceTabsState,
  updater: ChartLayout | ((prev: ChartLayout) => ChartLayout),
): WorkspaceTabsState {
  const activeId = state.activeTabId;
  const current = getActiveLayout(state);
  const next = typeof updater === "function" ? updater(current) : updater;
  return updateTabLayout(state, activeId, next);
}

export function updateTabRemote(
  state: WorkspaceTabsState,
  tabId: string,
  remote: WorkspaceTabRemote | undefined,
): WorkspaceTabsState {
  return {
    ...state,
    tabs: state.tabs.map((t) => {
      if (t.id !== tabId) return t;
      if (!remote) {
        const { remote: _removed, ...rest } = t;
        return rest;
      }
      return { ...t, remote };
    }),
  };
}

export function findTabByRemoteId(
  state: WorkspaceTabsState,
  resourceId: string,
): WorkspaceTab | undefined {
  return state.tabs.find((t) => t.remote?.resourceId === resourceId);
}

export function cloneLayoutForNewTab(layout: ChartLayout): ChartLayout {
  return structuredClone(layout);
}

export function createTabFromRemote(remote: ChartWorkspaceRemoteSummary): WorkspaceTab {
  return {
    id: createWorkspaceTabId(),
    title: remote.workspaceName,
    layout: remote.chartLayoutSnapshot as ChartLayout,
    remote: {
      resourceId: remote.id,
      syncRevision: remote.syncRevision,
      updatedAt: remote.updatedAt,
    },
  };
}

export function mergeRemoteWorkspaces(
  local: WorkspaceTabsState,
  remotes: ChartWorkspaceRemoteSummary[],
  options?: { dismissedRemoteIds?: ReadonlySet<string>; adoptOrphans?: boolean },
): { state: WorkspaceTabsState; changed: boolean } {
  const adoptOrphans = options?.adoptOrphans ?? true;
  const dismissed = options?.dismissedRemoteIds;
  const activeRemotes =
    dismissed && dismissed.size > 0
      ? remotes.filter((remote) => !dismissed.has(remote.id))
      : remotes;

  if (activeRemotes.length === 0) {
    return { state: local, changed: false };
  }

  const hasAnyRemote = local.tabs.some((tab) => tab.remote?.resourceId);
  if (!hasAnyRemote && local.tabs.length === 1 && activeRemotes.length === 1) {
    const remote = activeRemotes[0]!;
    const remoteLayout = remote.chartLayoutSnapshot as ChartLayout;
    const tab = local.tabs[0]!;
    if (
      JSON.stringify(remoteLayout) === JSON.stringify(tab.layout) &&
      tab.title === remote.workspaceName
    ) {
      return {
        state: {
          ...local,
          tabs: [
            {
              ...tab,
              remote: {
                resourceId: remote.id,
                syncRevision: remote.syncRevision,
                updatedAt: remote.updatedAt,
              },
            },
          ],
        },
        changed: true,
      };
    }
    return {
      state: {
        ...local,
        tabs: [
          {
            ...tab,
            title: remote.workspaceName,
            layout: remoteLayout,
            remote: {
              resourceId: remote.id,
              syncRevision: remote.syncRevision,
              updatedAt: remote.updatedAt,
            },
          },
        ],
      },
      changed: true,
    };
  }

  const remoteById = new Map(activeRemotes.map((r) => [r.id, r]));
  let changed = false;
  const linkedRemoteIds = new Set<string>();

  const tabs = local.tabs.map((tab) => {
    const resourceId = tab.remote?.resourceId;
    if (!resourceId) return tab;

    const remote = remoteById.get(resourceId);
    if (!remote) return tab;

    linkedRemoteIds.add(resourceId);
    const remoteLayout = remote.chartLayoutSnapshot as ChartLayout;
    const localMeta = tab.remote ?? null;

    if (
      isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
      JSON.stringify(remoteLayout) !== JSON.stringify(tab.layout)
    ) {
      changed = true;
      return {
        ...tab,
        title: remote.workspaceName,
        layout: remoteLayout,
        remote: {
          resourceId: remote.id,
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
        },
      };
    }

    if (tab.title !== remote.workspaceName) {
      changed = true;
      return {
        ...tab,
        title: remote.workspaceName,
        remote: {
          resourceId: remote.id,
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
        },
      };
    }

    return tab;
  });

  const orphanRemotes = activeRemotes
    .filter((r) => !linkedRemoteIds.has(r.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  let nextTabs = tabs;
  if (adoptOrphans) {
    for (const remote of orphanRemotes) {
      if (nextTabs.length >= MAX_WORKSPACE_TABS) break;
      if (nextTabs.some((t) => t.remote?.resourceId === remote.id)) continue;
      nextTabs = [...nextTabs, createTabFromRemote(remote)];
      changed = true;
    }
  }

  let activeTabId = local.activeTabId;
  if (!nextTabs.some((t) => t.id === activeTabId)) {
    activeTabId = nextTabs[0]!.id;
    changed = true;
  }

  if (!changed) {
    return { state: local, changed: false };
  }

  return {
    state: { version: 1, activeTabId, tabs: nextTabs },
    changed: true,
  };
}
