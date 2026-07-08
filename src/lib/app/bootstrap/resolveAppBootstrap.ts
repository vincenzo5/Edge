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
import { loadDismissedRemoteWorkspaceIds, hasPersistedWorkspaceTabs } from "../workspaceTabsStorage";
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

export type ResolveAppBootstrapDeps = {
  loadLocal?: () => LocalAppState;
  fetchRemoteList?: () => Promise<ChartWorkspaceRemoteSummary[] | null>;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
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

function applyRemoteMerge(
  localTabs: WorkspaceTabsState,
  remotes: ChartWorkspaceRemoteSummary[],
): { tabs: WorkspaceTabsState; changed: boolean } {
  const { state, changed } = mergeRemoteWorkspaces(localTabs, remotes, {
    dismissedRemoteIds: loadDismissedRemoteWorkspaceIds(),
    adoptOrphans: !hasPersistedWorkspaceTabs(),
  });
  return { tabs: state, changed };
}

export async function resolveAppBootstrap(
  deps: ResolveAppBootstrapDeps = {},
): Promise<AppBootstrapResult> {
  const loadLocal = deps.loadLocal ?? loadLocalAppState;
  const fetchRemoteList = deps.fetchRemoteList ?? fetchChartWorkspaces;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const local = loadLocal();

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
      const freshLocal = loadLocal();
      const { tabs, changed } = applyRemoteMerge(freshLocal.workspaceTabs, remotes);
      return changed ? tabs : null;
    };

    return buildResult(local, local.workspaceTabs, false, true, finishRemoteWorkspaceMerge);
  }

  if (!remoteResult || remoteResult.length === 0) {
    return buildResult(local, local.workspaceTabs, false, false);
  }

  try {
    const { tabs, changed } = applyRemoteMerge(local.workspaceTabs, remoteResult);
    return buildResult(local, tabs, changed, false);
  } catch {
    return buildResult(local, local.workspaceTabs, false, false);
  }
}

/** @deprecated Use workspaceTabs from AppBootstrapResult */
export function getBootstrapLayout(result: AppBootstrapResult) {
  return getActiveLayout(result.workspaceTabs);
}
