"use client";

import { useMemo } from "react";

import type { ScreenerState } from "@/lib/screener/types";
import {
  fetchScreenerLibrary,
  saveScreenerLibraryRemote,
} from "@/lib/persistence/client/screenerLibraryClient";
import {
  getScreenerLibrarySyncMetadata,
  setScreenerLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  useRevisionedRemoteSync,
  type RevisionedRemoteSyncAdapter,
} from "@/lib/persistence/sync/useRevisionedRemoteSync";

export function useScreenerLibraryRemoteSync(options: {
  state: ScreenerState;
  hydrated: boolean;
  onApplyRemoteState: (state: ScreenerState) => void;
}): void {
  const adapter = useMemo<RevisionedRemoteSyncAdapter<ScreenerState>>(
    () => ({
      fetchRemote: async () => {
        const remote = await fetchScreenerLibrary();
        if (!remote) return null;
        return {
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
          snapshot: remote.screenerSnapshot as ScreenerState,
        };
      },
      saveRemote: async (state, baseRevision) => {
        const result = await saveScreenerLibraryRemote(state, baseRevision);
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
                snapshot: result.current.screenerSnapshot as ScreenerState | undefined,
              }
            : undefined,
        };
      },
      getMeta: getScreenerLibrarySyncMetadata,
      setMeta: setScreenerLibrarySyncMetadata,
    }),
    [],
  );

  useRevisionedRemoteSync({
    adapter,
    state: options.state,
    hydrated: options.hydrated,
    onApplyRemoteState: options.onApplyRemoteState,
  });
}
