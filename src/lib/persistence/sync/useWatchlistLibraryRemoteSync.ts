"use client";

import { useMemo } from "react";

import type { WatchlistState } from "@/lib/watchlist/types";
import {
  fetchWatchlistLibrary,
  saveWatchlistLibraryRemote,
} from "@/lib/persistence/client/watchlistLibraryClient";
import {
  getWatchlistLibrarySyncMetadata,
  setWatchlistLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";
import {
  useRevisionedRemoteSync,
  type RevisionedRemoteSyncAdapter,
} from "@/lib/persistence/sync/useRevisionedRemoteSync";

export function useWatchlistLibraryRemoteSync(options: {
  state: WatchlistState;
  hydrated: boolean;
  onApplyRemoteState: (state: WatchlistState) => void;
}): void {
  const adapter = useMemo<RevisionedRemoteSyncAdapter<WatchlistState>>(
    () => ({
      fetchRemote: async () => {
        const remote = await fetchWatchlistLibrary();
        if (!remote) return null;
        return {
          syncRevision: remote.syncRevision,
          updatedAt: remote.updatedAt,
          snapshot: remote.watchlistSnapshot as WatchlistState,
        };
      },
      saveRemote: async (state, baseRevision) => {
        const result = await saveWatchlistLibraryRemote(state, baseRevision);
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
                snapshot: result.current.watchlistSnapshot as WatchlistState | undefined,
              }
            : undefined,
        };
      },
      getMeta: getWatchlistLibrarySyncMetadata,
      setMeta: setWatchlistLibrarySyncMetadata,
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
