"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ScreenerState } from "@/lib/screener/types";
import {
  fetchScreenerLibrary,
  saveScreenerLibraryRemote,
} from "@/lib/persistence/client/screenerLibraryClient";
import {
  getScreenerLibrarySyncMetadata,
  isRemoteNewer,
  setScreenerLibrarySyncMetadata,
} from "@/lib/persistence/sync/syncMetadata";

export function useScreenerLibraryRemoteSync(options: {
  state: ScreenerState;
  hydrated: boolean;
  onApplyRemoteState: (state: ScreenerState) => void;
}): void {
  const stateRef = useRef(options.state);
  const syncingRef = useRef(false);
  const remoteHydratedRef = useRef(false);

  stateRef.current = options.state;

  const applyRemoteIfNewer = useCallback(async () => {
    const remote = await fetchScreenerLibrary();
    if (!remote) {
      remoteHydratedRef.current = true;
      return;
    }

    const localMeta = getScreenerLibrarySyncMetadata();
    if (!localMeta) {
      setScreenerLibrarySyncMetadata({
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      if (JSON.stringify(remote.screenerSnapshot) !== JSON.stringify(stateRef.current)) {
        options.onApplyRemoteState(remote.screenerSnapshot as ScreenerState);
      }
      remoteHydratedRef.current = true;
      return;
    }

    if (
      isRemoteNewer(localMeta, remote.updatedAt, remote.syncRevision) &&
      JSON.stringify(remote.screenerSnapshot) !== JSON.stringify(stateRef.current)
    ) {
      setScreenerLibrarySyncMetadata({
        syncRevision: remote.syncRevision,
        updatedAt: remote.updatedAt,
      });
      options.onApplyRemoteState(remote.screenerSnapshot as ScreenerState);
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
          const result = await saveScreenerLibraryRemote(
            stateRef.current,
            getScreenerLibrarySyncMetadata()?.syncRevision ?? 0,
          );

          if (result.ok) {
            setScreenerLibrarySyncMetadata({
              syncRevision: result.record.syncRevision,
              updatedAt: result.record.updatedAt,
            });
          } else if (result.current) {
            if (result.current.screenerSnapshot) {
              options.onApplyRemoteState(result.current.screenerSnapshot as ScreenerState);
            }
            setScreenerLibrarySyncMetadata({
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
