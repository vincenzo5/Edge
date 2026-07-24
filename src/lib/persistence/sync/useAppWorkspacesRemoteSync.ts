"use client";

import { useEffect, useMemo, useRef } from "react";

import type { AppWorkspacesState } from "@/lib/appWorkspace/types";
import {
  fetchAppWorkspacesLibrary,
  saveAppWorkspacesLibraryRemote,
} from "@/lib/persistence/client/appWorkspacesClient";
import {
  getAppWorkspacesSyncMetadata,
  setAppWorkspacesSyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  useRevisionedRemoteSync,
  type RevisionedRemoteSyncAdapter,
} from "@/lib/persistence/sync/useRevisionedRemoteSync";

export function useAppWorkspacesRemoteSync(options: {
  state: AppWorkspacesState;
  hydrated: boolean;
  bootstrapRemoteApplied?: boolean;
  bootstrapRemotePending?: boolean;
  finishRemoteAppWorkspacesMerge?: () => Promise<AppWorkspacesState | null>;
  onApplyRemoteState: (state: AppWorkspacesState) => void;
}): void {
  const adapter = useMemo<RevisionedRemoteSyncAdapter<AppWorkspacesState>>(
    () => ({
      fetchRemote: async () => {
        const remote = await fetchAppWorkspacesLibrary();
        if (!remote) return null;
        return {
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
          snapshot: remote.appWorkspacesSnapshot as AppWorkspacesState,
        };
      },
      saveRemote: async (state, baseRevision) => {
        const result = await saveAppWorkspacesLibraryRemote(state, baseRevision);
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
                snapshot: result.current.appWorkspacesSnapshot as AppWorkspacesState | undefined,
              }
            : undefined,
        };
      },
      getMeta: getAppWorkspacesSyncMetadata,
      setMeta: setAppWorkspacesSyncMetadata,
    }),
    [],
  );

  useRevisionedRemoteSync({
    adapter,
    state: options.state,
    hydrated: options.hydrated,
    skipInitialHydrate: options.bootstrapRemoteApplied,
    onApplyRemoteState: options.onApplyRemoteState,
  });

  const finishRef = useRef(options.finishRemoteAppWorkspacesMerge);
  finishRef.current = options.finishRemoteAppWorkspacesMerge;

  useEffect(() => {
    if (!options.hydrated || !options.bootstrapRemotePending) return;
    const finish = finishRef.current;
    if (!finish) return;

    void finish().then((merged) => {
      if (merged) {
        options.onApplyRemoteState(merged);
      }
    });
  }, [options.bootstrapRemotePending, options.hydrated, options.onApplyRemoteState]);
}
