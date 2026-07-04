import type { ChartLayout } from "@/lib/chartConfig";
import {
  fetchDefaultChartWorkspace,
  type ChartWorkspaceRemoteRecord,
} from "@/lib/persistence/client/chartWorkspaceClient";
import {
  getChartWorkspaceSyncMetadata,
  isRemoteNewer,
  setChartWorkspaceSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  createDefaultScreenerSession,
  type ScreenerSessionState,
} from "@/lib/screener/screenerSession";
import type { ScreenerState } from "@/lib/screener/types";
import type { WatchlistState } from "@/lib/watchlist/types";
import { loadLocalAppState, type LocalAppState } from "./loadLocalAppState";

export const REMOTE_BOOTSTRAP_TIMEOUT_MS = 500;

export type AppBootstrapResult = {
  layout: ChartLayout;
  watchlist: WatchlistState;
  screener: ScreenerState;
  screenerSession: ScreenerSessionState;
  remoteApplied: boolean;
  remotePending: boolean;
  /** When remote fetch exceeded the bootstrap timeout, await and apply if newer. */
  finishRemoteLayout?: () => Promise<ChartLayout | null>;
};

export type ResolveAppBootstrapDeps = {
  loadLocal?: () => LocalAppState;
  fetchRemote?: () => Promise<ChartWorkspaceRemoteRecord | null>;
  getSyncMetadata?: typeof getChartWorkspaceSyncMetadata;
  setSyncMetadata?: typeof setChartWorkspaceSyncMetadata;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeRemoteLayout(
  localLayout: ChartLayout,
  remote: ChartWorkspaceRemoteRecord,
  localMeta: ReturnType<typeof getChartWorkspaceSyncMetadata>,
  setSyncMetadata: typeof setChartWorkspaceSyncMetadata,
): ChartLayout | null {
  const remoteLayout = remote.chartLayoutSnapshot as ChartLayout;
  if (!localMeta) {
    setSyncMetadata({
      resourceId: remote.id,
      syncRevision: remote.syncRevision,
      updatedAt: remote.updatedAt,
    });
    return JSON.stringify(remoteLayout) !== JSON.stringify(localLayout) ? remoteLayout : null;
  }

  if (
    isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
    JSON.stringify(remoteLayout) !== JSON.stringify(localLayout)
  ) {
    setSyncMetadata({
      resourceId: remote.id,
      syncRevision: remote.syncRevision,
      updatedAt: remote.updatedAt,
    });
    return remoteLayout;
  }

  return null;
}

function buildResult(
  local: LocalAppState,
  layout: ChartLayout,
  remoteApplied: boolean,
  remotePending: boolean,
  finishRemoteLayout?: () => Promise<ChartLayout | null>,
): AppBootstrapResult {
  return {
    layout,
    watchlist: local.watchlist,
    screener: local.screener,
    screenerSession: createDefaultScreenerSession(local.screener),
    remoteApplied,
    remotePending,
    finishRemoteLayout,
  };
}

export async function resolveAppBootstrap(
  deps: ResolveAppBootstrapDeps = {},
): Promise<AppBootstrapResult> {
  const loadLocal = deps.loadLocal ?? loadLocalAppState;
  const fetchRemote = deps.fetchRemote ?? fetchDefaultChartWorkspace;
  const getSyncMetadata = deps.getSyncMetadata ?? getChartWorkspaceSyncMetadata;
  const setSyncMetadata = deps.setSyncMetadata ?? setChartWorkspaceSyncMetadata;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const local = loadLocal();
  let remoteFetchPromise: Promise<ChartWorkspaceRemoteRecord | null> | null = null;

  const startRemoteFetch = () => {
    if (!remoteFetchPromise) {
      remoteFetchPromise = fetchRemote();
    }
    return remoteFetchPromise;
  };

  const remoteResult = await Promise.race([
    startRemoteFetch(),
    sleep(remoteTimeoutMs).then(() => "timeout" as const),
  ]);

  if (remoteResult === "timeout") {
    const finishRemoteLayout = async (): Promise<ChartLayout | null> => {
      const remote = await startRemoteFetch();
      if (!remote) return null;
      return mergeRemoteLayout(local.layout, remote, getSyncMetadata(), setSyncMetadata);
    };

    return buildResult(local, local.layout, false, true, finishRemoteLayout);
  }

  if (!remoteResult) {
    return buildResult(local, local.layout, false, false);
  }

  const merged = mergeRemoteLayout(
    local.layout,
    remoteResult,
    getSyncMetadata(),
    setSyncMetadata,
  );

  return buildResult(local, merged ?? local.layout, merged != null, false);
}
