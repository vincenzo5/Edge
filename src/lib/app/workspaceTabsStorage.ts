import type { ChartLayout } from "@/lib/chartConfig";
import { migrateChartLayout } from "@/lib/chartConfig";
import { loadLayout } from "@/lib/layoutStorage";
import { getChartWorkspaceSyncMetadata } from "@/lib/persistence/sync/syncMetadata";
import {
  createDefaultWorkspaceTabs,
  type WorkspaceTabRemote,
  type WorkspaceTabsState,
} from "./workspaceTabs";

export const WORKSPACE_TABS_STORAGE_KEY = "tv-ai:workspace-tabs:v1";
export const DISMISSED_REMOTE_WORKSPACES_KEY = "tv-ai:workspace-tabs:dismissed-remotes:v1";

function readLegacyRemoteMetadata(): WorkspaceTabRemote | undefined {
  const meta = getChartWorkspaceSyncMetadata();
  if (!meta?.resourceId) return undefined;
  return {
    resourceId: meta.resourceId,
    syncRevision: meta.syncRevision,
    updatedAt: meta.updatedAt,
  };
}

function normalizeTabsState(parsed: Partial<WorkspaceTabsState>): WorkspaceTabsState | null {
  if (parsed.version !== 1 || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
    return null;
  }

  const tabs = parsed.tabs.filter(
    (t): t is WorkspaceTabsState["tabs"][number] =>
      typeof t?.id === "string" &&
      typeof t?.title === "string" &&
      t.layout != null &&
      typeof t.layout === "object",
  );

  if (tabs.length === 0) return null;

  const activeTabId =
    typeof parsed.activeTabId === "string" && tabs.some((t) => t.id === parsed.activeTabId)
      ? parsed.activeTabId
      : tabs[0]!.id;

  return {
    version: 1,
    activeTabId,
    tabs: tabs.map((tab) => ({
      ...tab,
      layout: migrateChartLayout(tab.layout as ChartLayout),
    })),
  };
}

export function migrateLayoutToWorkspaceTabs(layout: ChartLayout): WorkspaceTabsState {
  const remote = readLegacyRemoteMetadata();
  return createDefaultWorkspaceTabs(layout, remote);
}

export function loadWorkspaceTabs(): WorkspaceTabsState {
  if (typeof window === "undefined") {
    return createDefaultWorkspaceTabs();
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceTabsState>;
      const normalized = normalizeTabsState(parsed);
      if (normalized) return normalized;
    }
  } catch {
    // fall through to migration
  }

  const layout = loadLayout();
  return migrateLayoutToWorkspaceTabs(layout);
}

export function saveWorkspaceTabs(state: WorkspaceTabsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or disabled; ignore.
  }
}

export function hasPersistedWorkspaceTabs(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function clearWorkspaceTabs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WORKSPACE_TABS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readDismissedRemoteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_REMOTE_WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeDismissedRemoteIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(DISMISSED_REMOTE_WORKSPACES_KEY);
      return;
    }
    window.localStorage.setItem(DISMISSED_REMOTE_WORKSPACES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function loadDismissedRemoteWorkspaceIds(): Set<string> {
  return new Set(readDismissedRemoteIds());
}

export function recordDismissedRemoteWorkspace(resourceId: string): void {
  const trimmed = resourceId.trim();
  if (!trimmed) return;
  const ids = readDismissedRemoteIds();
  if (ids.includes(trimmed)) return;
  writeDismissedRemoteIds([...ids, trimmed]);
}

export function clearDismissedRemoteWorkspace(resourceId: string): void {
  const trimmed = resourceId.trim();
  if (!trimmed) return;
  writeDismissedRemoteIds(readDismissedRemoteIds().filter((id) => id !== trimmed));
}

/** Read active tab theme from localStorage for SSR inline script (no DOM). */
export function readActiveTabThemeFromStorage(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceTabsState>;
      const normalized = normalizeTabsState(parsed);
      const theme = normalized?.tabs.find((t) => t.id === normalized.activeTabId)?.layout
        .theme;
      if (theme === "light" || theme === "dark") return theme;
    }

    const legacyRaw = window.localStorage.getItem("tv-ai:layout:v1");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { theme?: unknown };
      if (legacy.theme === "light" || legacy.theme === "dark") return legacy.theme;
    }
  } catch {
    // ignore
  }
  return null;
}
