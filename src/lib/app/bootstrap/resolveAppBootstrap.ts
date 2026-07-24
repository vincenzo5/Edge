import {
  fetchChartWorkspaces,
  type ChartWorkspaceRemoteSummary,
} from "@/lib/persistence/client/chartWorkspaceClient";
import {
  createDefaultScreenerSession,
  type ScreenerSessionState,
} from "@/lib/screener/screenerSession";
import type { ScreenerState } from "@/lib/screener/types";
import type { WatchlistState } from "@/lib/watchlist/types";
import {
  getActiveLayout,
  mergeRemoteWorkspaces,
  type WorkspaceTabsState,
} from "../workspaceTabs";
import {
  hasPersistedWorkspaceTabs,
  loadDismissedRemoteWorkspaceIds,
  type WorkspaceTabsStorageBinding,
} from "../workspaceTabsStorage";
import type { ChartTileBootstrapBinding } from "./chartTileBootstrapBinding";
import { resolveChartTileBootstrapBinding } from "./chartTileBootstrapBinding";
import { loadLocalAppState, type LocalAppState } from "./loadLocalAppState";

export const REMOTE_BOOTSTRAP_TIMEOUT_MS = 500;

export type AppBootstrapResult = {
  workspaceTabs: WorkspaceTabsState;
  watchlist: WatchlistState;
  screener: ScreenerState;
  screenerSession: ScreenerSessionState;
  remoteApplied: boolean;
  remotePending: boolean;
  /** When remote fetch exceeded the bootstrap timeout, await and apply if newer. */
  finishRemoteWorkspaceMerge?: () => Promise<WorkspaceTabsState | null>;
};

export type ResolveAppBootstrapOptions = {
  chartTileBinding?: ChartTileBootstrapBinding;
};

export type ResolveAppBootstrapDeps = {
  loadLocal?: (options?: { chartTileBinding?: ChartTileBootstrapBinding }) => LocalAppState;
  fetchRemoteList?: () => Promise<ChartWorkspaceRemoteSummary[] | null>;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  chartTileBinding?: ChartTileBootstrapBinding;
};

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildResult(
  local: LocalAppState,
  workspaceTabs: WorkspaceTabsState,
  remoteApplied: boolean,
  remotePending: boolean,
  finishRemoteWorkspaceMerge?: () => Promise<WorkspaceTabsState | null>,
): AppBootstrapResult {
  return {
    workspaceTabs,
    watchlist: local.watchlist,
    screener: local.screener,
    screenerSession: createDefaultScreenerSession(local.screener),
    remoteApplied,
    remotePending,
    finishRemoteWorkspaceMerge,
  };
}

function storageBinding(binding: ChartTileBootstrapBinding): WorkspaceTabsStorageBinding {
  return {
    tileId: binding.tileId,
    isPrimaryChartTile: binding.isPrimaryChartTile,
  };
}

function resolveAdoptOrphans(binding: ChartTileBootstrapBinding): boolean {
  if (!binding.isPrimaryChartTile) return false;
  if (binding.chartWorkspaceId) return false;
  return !hasPersistedWorkspaceTabs(storageBinding(binding));
}

function filterRemotesForBinding(
  remotes: ChartWorkspaceRemoteSummary[],
  binding: ChartTileBootstrapBinding,
): ChartWorkspaceRemoteSummary[] {
  if (!binding.chartWorkspaceId) return remotes;
  return remotes.filter((remote) => remote.id === binding.chartWorkspaceId);
}

function applyRemoteMerge(
  localTabs: WorkspaceTabsState,
  remotes: ChartWorkspaceRemoteSummary[],
  binding: ChartTileBootstrapBinding,
): { tabs: WorkspaceTabsState; changed: boolean } {
  const filtered = filterRemotesForBinding(remotes, binding);
  const { state, changed } = mergeRemoteWorkspaces(localTabs, filtered, {
    dismissedRemoteIds: loadDismissedRemoteWorkspaceIds(),
    adoptOrphans: resolveAdoptOrphans(binding),
  });
  return { tabs: state, changed };
}

export async function resolveAppBootstrap(
  deps: ResolveAppBootstrapDeps = {},
): Promise<AppBootstrapResult> {
  const binding = resolveChartTileBootstrapBinding(deps.chartTileBinding);
  const loadLocal =
    deps.loadLocal ??
    ((options?: { chartTileBinding?: ChartTileBootstrapBinding }) =>
      loadLocalAppState(options));
  const fetchRemoteList = deps.fetchRemoteList ?? fetchChartWorkspaces;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const local = loadLocal({ chartTileBinding: binding });

  let remoteFetchPromise: Promise<ChartWorkspaceRemoteSummary[] | null> | null = null;

  const startRemoteFetch = () => {
    if (!remoteFetchPromise) {
      remoteFetchPromise = fetchRemoteList();
    }
    return remoteFetchPromise;
  };

  let remoteResult: ChartWorkspaceRemoteSummary[] | null | "timeout";
  try {
    remoteResult = await Promise.race([
      startRemoteFetch(),
      sleep(remoteTimeoutMs).then(() => "timeout" as const),
    ]);
  } catch {
    remoteResult = null;
  }

  if (remoteResult === "timeout") {
    const finishRemoteWorkspaceMerge = async (): Promise<WorkspaceTabsState | null> => {
      const remotes = await startRemoteFetch();
      if (!remotes || remotes.length === 0) return null;
      const freshLocal = loadLocal({ chartTileBinding: binding });
      const { tabs, changed } = applyRemoteMerge(freshLocal.workspaceTabs, remotes, binding);
      return changed ? tabs : null;
    };

    return buildResult(local, local.workspaceTabs, false, true, finishRemoteWorkspaceMerge);
  }

  if (!remoteResult || remoteResult.length === 0) {
    return buildResult(local, local.workspaceTabs, false, false);
  }

  try {
    const { tabs, changed } = applyRemoteMerge(local.workspaceTabs, remoteResult, binding);
    return buildResult(local, tabs, changed, false);
  } catch {
    return buildResult(local, local.workspaceTabs, false, false);
  }
}

/** @deprecated Use workspaceTabs from AppBootstrapResult */
export function getBootstrapLayout(result: AppBootstrapResult) {
  return getActiveLayout(result.workspaceTabs);
}
