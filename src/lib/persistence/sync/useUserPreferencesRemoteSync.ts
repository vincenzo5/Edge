"use client";

import { useEffect, useMemo, useRef } from "react";

import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import {
  fetchUserPreferencesLibrary,
  saveUserPreferencesLibraryRemote,
} from "@/lib/persistence/client/userPreferencesClient";
import {
  getUserPreferencesSyncMetadata,
  setUserPreferencesSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  useRevisionedRemoteSync,
  type RevisionedRemoteSyncAdapter,
} from "@/lib/persistence/sync/useRevisionedRemoteSync";

export function useUserPreferencesRemoteSync(options: {
  snapshot: UserPreferencesSnapshot;
  hydrated: boolean;
  bootstrapRemoteApplied?: boolean;
  bootstrapRemotePending?: boolean;
  finishRemoteUserPreferencesMerge?: () => Promise<UserPreferencesSnapshot | null>;
  onApplyRemoteSnapshot: (snapshot: UserPreferencesSnapshot) => void;
}): void {
  const adapter = useMemo<RevisionedRemoteSyncAdapter<UserPreferencesSnapshot>>(
    () => ({
      fetchRemote: async () => {
        const remote = await fetchUserPreferencesLibrary();
        if (!remote) return null;
        return {
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
          snapshot: remote.preferencesSnapshot,
        };
      },
      saveRemote: async (snapshot, baseRevision) => {
        const result = await saveUserPreferencesLibraryRemote(snapshot, baseRevision);
        if (result.ok) {
          return {
            ok: true,
            record: {
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            },
          };
        }
        return {
          ok: false,
          current: result.current
            ? {
                syncRevision: result.current.syncRevision,
                updatedAt: result.current.updatedAt,
                snapshot: result.current.preferencesSnapshot,
              }
            : undefined,
        };
      },
      getMeta: getUserPreferencesSyncMetadata,
      setMeta: setUserPreferencesSyncMetadata,
    }),
    [],
  );

  useRevisionedRemoteSync({
    adapter,
    state: options.snapshot,
    hydrated: options.hydrated,
    skipInitialHydrate: options.bootstrapRemoteApplied,
    onApplyRemoteState: options.onApplyRemoteSnapshot,
  });

  const finishRef = useRef(options.finishRemoteUserPreferencesMerge);
  finishRef.current = options.finishRemoteUserPreferencesMerge;

  useEffect(() => {
    if (!options.hydrated || !options.bootstrapRemotePending) return;
    const finish = finishRef.current;
    if (!finish) return;

    void finish().then((merged) => {
      if (merged) {
        options.onApplyRemoteSnapshot(merged);
      }
    });
  }, [options.bootstrapRemotePending, options.hydrated, options.onApplyRemoteSnapshot]);
}
