"use client";

import { useCallback, useEffect, useRef } from "react";

import type { WatchlistState } from "@/lib/watchlist/types";
import {
  fetchWatchlistLibrary,
  saveWatchlistLibraryRemote,
} from "@/lib/persistence/client/watchlistLibraryClient";
import {
  getWatchlistLibrarySyncMetadata,
  isRemoteNewer,
  setWatchlistLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";

export function useWatchlistLibraryRemoteSync(options: {
  state: WatchlistState;
  hydrated: boolean;
  onApplyRemoteState: (state: WatchlistState) => void;
}): void {
  const stateRef = useRef(options.state);
  const syncingRef = useRef(false);
  const remoteHydratedRef = useRef(false);

  stateRef.current = options.state;

  const applyRemoteIfNewer = useCallback(async () => {
    const remote = await fetchWatchlistLibrary();
    if (!remote) {
      remoteHydratedRef.current = true;
      return;
    }

    const localMeta = getWatchlistLibrarySyncMetadata();
    if (!localMeta) {
      setWatchlistLibrarySyncMetadata({
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      if (JSON.stringify(remote.watchlistSnapshot) !== JSON.stringify(stateRef.current)) {
        options.onApplyRemoteState(remote.watchlistSnapshot as WatchlistState);
      }
      remoteHydratedRef.current = true;
      return;
    }

    if (
      isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
      JSON.stringify(remote.watchlistSnapshot) !== JSON.stringify(stateRef.current)
    ) {
      setWatchlistLibrarySyncMetadata({
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      options.onApplyRemoteState(remote.watchlistSnapshot as WatchlistState);
    }

    remoteHydratedRef.current = true;
  }, [options.onApplyRemoteState]);

  useEffect(() => {
    if (!options.hydrated || remoteHydratedRef.current) return;
    void applyRemoteIfNewer();
  }, [options.hydrated, applyRemoteIfNewer]);

  useEffect(() => {
    if (!options.hydrated || !remoteHydratedRef.current) return;

    const timer = window.setTimeout(() => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      void (async () => {
        try {
          const result = await saveWatchlistLibraryRemote(
            stateRef.current,
            getWatchlistLibrarySyncMetadata()?.syncRevision ?? 0,
          );

          if (result.ok) {
            setWatchlistLibrarySyncMetadata({
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            });
          } else if (result.current) {
            if (result.current.watchlistSnapshot) {
              options.onApplyRemoteState(result.current.watchlistSnapshot as WatchlistState);
            }
            setWatchlistLibrarySyncMetadata({
              syncRevision: result.current.syncRevision,
              updatedAt: result.current.updatedAt,
            });
          }
        } finally {
          syncingRef.current = false;
        }
      })();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [options.hydrated, options.state, options.onApplyRemoteState]);
}
