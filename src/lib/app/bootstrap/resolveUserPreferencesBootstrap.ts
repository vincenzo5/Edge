import type { UserPreferencesLibraryRemoteRecord } from "@/lib/persistence/client/userPreferencesClient";
import { fetchUserPreferencesLibrary } from "@/lib/persistence/client/userPreferencesClient";
import {
  getUserPreferencesSyncMetadata,
  isRemoteNewer,
  setUserPreferencesSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";

export const REMOTE_USER_PREFERENCES_BOOTSTRAP_TIMEOUT_MS = 500;

export type UserPreferencesBootstrapResult = {
  snapshot: UserPreferencesSnapshot;
  remoteApplied: boolean;
  remotePending: boolean;
  finishRemoteUserPreferencesMerge?: () => Promise<UserPreferencesSnapshot | null>;
};

export type ResolveUserPreferencesBootstrapDeps = {
  fetchRemote?: () => Promise<UserPreferencesLibraryRemoteRecord | null>;
  remoteTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function sleepDefault(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotsEqual(a: UserPreferencesSnapshot, b: UserPreferencesSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function shouldApplyRemote(
  localSnapshot: UserPreferencesSnapshot,
  remote: UserPreferencesLibraryRemoteRecord,
): boolean {
  const localMeta = getUserPreferencesSyncMetadata();
  if (!localMeta) {
    return !snapshotsEqual(localSnapshot, remote.preferencesSnapshot);
  }
  return (
    isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
    !snapshotsEqual(localSnapshot, remote.preferencesSnapshot)
  );
}

function applyRemoteMeta(
  remote: Pick<UserPreferencesLibraryRemoteRecord, "syncRevision" | "updatedAt">,
): void {
  setUserPreferencesSyncMetadata({
    syncRevision: remote.syncRevision,
    updatedAt: remote.updatedAt,
  });
}

function mergeRemoteSnapshot(
  localSnapshot: UserPreferencesSnapshot,
  remote: UserPreferencesLibraryRemoteRecord,
): UserPreferencesSnapshot | null {
  if (!shouldApplyRemote(localSnapshot, remote)) return null;
  applyRemoteMeta(remote);
  return remote.preferencesSnapshot;
}

export async function resolveUserPreferencesBootstrap(
  localSnapshot: UserPreferencesSnapshot,
  deps: ResolveUserPreferencesBootstrapDeps = {},
): Promise<UserPreferencesBootstrapResult> {
  const fetchRemote = deps.fetchRemote ?? fetchUserPreferencesLibrary;
  const remoteTimeoutMs = deps.remoteTimeoutMs ?? REMOTE_USER_PREFERENCES_BOOTSTRAP_TIMEOUT_MS;
  const sleep = deps.sleep ?? sleepDefault;

  const remotePromise = fetchRemote();

  const raced = await Promise.race([
    remotePromise.then((remote) => ({ kind: "remote" as const, remote })),
    sleep(remoteTimeoutMs).then(() => ({ kind: "timeout" as const })),
  ]);

  if (raced.kind === "timeout") {
    const finishRemoteUserPreferencesMerge = async (): Promise<UserPreferencesSnapshot | null> => {
      const remote = await remotePromise;
      if (!remote) return null;
      return mergeRemoteSnapshot(localSnapshot, remote);
    };

    return {
      snapshot: localSnapshot,
      remoteApplied: false,
      remotePending: true,
      finishRemoteUserPreferencesMerge,
    };
  }

  const remote = raced.remote;
  if (!remote) {
    return {
      snapshot: localSnapshot,
      remoteApplied: false,
      remotePending: false,
    };
  }

  const merged = mergeRemoteSnapshot(localSnapshot, remote);
  if (merged) {
    return {
      snapshot: merged,
      remoteApplied: true,
      remotePending: false,
    };
  }

  applyRemoteMeta(remote);
  return {
    snapshot: localSnapshot,
    remoteApplied: false,
    remotePending: false,
  };
}
