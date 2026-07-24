import {
  mergeRemoteWorkspaces,
  type WorkspaceTabsState,
} from "@/lib/app/workspaceTabs";
import { loadDismissedRemoteWorkspaceIds } from "@/lib/app/workspaceTabsStorage";
import type { ChartWorkspaceRemoteSummary } from "@/lib/persistence/client/chartWorkspaceClient";
import { REMOTE_BOOTSTRAP_TIMEOUT_MS } from "./resolveAppBootstrap";

export type ResolveHomeWorkspaceTabsResult = {
  tabs: WorkspaceTabsState;
  remoteApplied: boolean;
  remotePending: boolean;
  finishRemoteWorkspaceMerge?: () => Promise<WorkspaceTabsState | null>;
};

export type ResolveHomeWorkspaceTabsDeps = {
  loadLocal: () => WorkspaceTabsState;
  fetchRemoteList?: () => Promise<ChartWorkspaceRemoteSummary[] | null>;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function applyRemoteMerge(
  localTabs: WorkspaceTabsState,
  remotes: ChartWorkspaceRemoteSummary[],
): { tabs: WorkspaceTabsState; changed: boolean } {
  const { state, changed } = mergeRemoteWorkspaces(localTabs, remotes, {
    dismissedRemoteIds: loadDismissedRemoteWorkspaceIds(),
    adoptOrphans: true,
  });
  return { tabs: state, changed };
}

export async function resolveHomeWorkspaceTabs(
  deps: ResolveHomeWorkspaceTabsDeps,
): Promise<ResolveHomeWorkspaceTabsResult> {
  const loadLocal = deps.loadLocal;
  const fetchRemoteList = deps.fetchRemoteList;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const local = loadLocal();

  if (!fetchRemoteList) {
    return { tabs: local, remoteApplied: false, remotePending: false };
  }

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
      const { tabs, changed } = applyRemoteMerge(freshLocal, remotes);
      return changed ? tabs : null;
    };

    return {
      tabs: local,
      remoteApplied: false,
      remotePending: true,
      finishRemoteWorkspaceMerge,
    };
  }

  if (!remoteResult || remoteResult.length === 0) {
    return { tabs: local, remoteApplied: false, remotePending: false };
  }

  try {
    const { tabs, changed } = applyRemoteMerge(local, remoteResult);
    return { tabs, remoteApplied: changed, remotePending: false };
  } catch {
    return { tabs: local, remoteApplied: false, remotePending: false };
  }
}
