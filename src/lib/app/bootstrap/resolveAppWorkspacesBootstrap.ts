import type { AppWorkspacesLibraryRemoteRecord } from "@/lib/persistence/client/appWorkspacesClient";
import { fetchAppWorkspacesLibrary } from "@/lib/persistence/client/appWorkspacesClient";
import {
  getAppWorkspacesSyncMetadata,
  isRemoteNewer,
  setAppWorkspacesSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import type { AppWorkspacesState } from "@/lib/appWorkspace/types";

export const REMOTE_APP_WORKSPACES_BOOTSTRAP_TIMEOUT_MS = 500;

export type AppWorkspacesBootstrapResult = {
  state: AppWorkspacesState;
  remoteApplied: boolean;
  remotePending: boolean;
  finishRemoteAppWorkspacesMerge?: () => Promise<AppWorkspacesState | null>;
};

export type ResolveAppWorkspacesBootstrapDeps = {
  fetchRemote?: () => Promise<AppWorkspacesLibraryRemoteRecord | null>;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotsEqual(a: AppWorkspacesState, b: AppWorkspacesState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function shouldApplyRemote(
  localState: AppWorkspacesState,
  remote: AppWorkspacesLibraryRemoteRecord,
): boolean {
  const localMeta = getAppWorkspacesSyncMetadata();
  if (!localMeta) {
    return !snapshotsEqual(localState, remote.appWorkspacesSnapshot as AppWorkspacesState);
  }
  return (
    isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
    !snapshotsEqual(localState, remote.appWorkspacesSnapshot as AppWorkspacesState)
  );
}

function applyRemoteMeta(remote: Pick<AppWorkspacesLibraryRemoteRecord, "syncRevision" | "updatedAt">): void {
  setAppWorkspacesSyncMetadata({
    syncRevision: remote.syncRevision,
    updatedAt: remote.updatedAt,
  });
}

function mergeRemoteSnapshot(
  localState: AppWorkspacesState,
  remote: AppWorkspacesLibraryRemoteRecord,
): AppWorkspacesState | null {
  if (!shouldApplyRemote(localState, remote)) return null;
  applyRemoteMeta(remote);
  return remote.appWorkspacesSnapshot as AppWorkspacesState;
}

export async function resolveAppWorkspacesBootstrap(
  localState: AppWorkspacesState,
  deps: ResolveAppWorkspacesBootstrapDeps = {},
): Promise<AppWorkspacesBootstrapResult> {
  const fetchRemote = deps.fetchRemote ?? fetchAppWorkspacesLibrary;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_APP_WORKSPACES_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const remotePromise = fetchRemote();

  const raced = await Promise.race([
    remotePromise.then((remote) => ({ kind: "remote" as const, remote })),
    sleep(remoteTimeoutMs).then(() => ({ kind: "timeout" as const })),
  ]);

  if (raced.kind === "timeout") {
    const finishRemoteAppWorkspacesMerge = async (): Promise<AppWorkspacesState | null> => {
      const remote = await remotePromise;
      if (!remote) return null;
      return mergeRemoteSnapshot(localState, remote);
    };

    return {
      state: localState,
      remoteApplied: false,
      remotePending: true,
      finishRemoteAppWorkspacesMerge,
    };
  }

  const remote = raced.remote;
  if (!remote) {
    return {
      state: localState,
      remoteApplied: false,
      remotePending: false,
    };
  }

  const merged = mergeRemoteSnapshot(localState, remote);
  if (merged) {
    return {
      state: merged,
      remoteApplied: true,
      remotePending: false,
    };
  }

  applyRemoteMeta(remote);
  return {
    state: localState,
    remoteApplied: false,
    remotePending: false,
  };
}
