"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WatchlistState } from "@/lib/watchlist/types";
import type { WatchlistActions } from "@/lib/ai/context";
import {
  DEFAULT_WATCHLIST_STATE,
  loadWatchlistState,
  saveWatchlistState,
} from "@/lib/watchlist/storage";
import { useWatchlistLibraryRemoteSync } from "@/lib/persistence/sync/useWatchlistLibraryRemoteSync";

export type WatchlistContextValue = WatchlistActions & {
  state: WatchlistState;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: WatchlistState;
}) {
  const [state, setState] = useState<WatchlistState>(initialState ?? DEFAULT_WATCHLIST_STATE);
  const [hydrated, setHydrated] = useState(initialState != null);
  const hydratedRef = useRef(initialState != null);

  useEffect(() => {
    if (initialState != null) return;
    setState(loadWatchlistState());
    hydratedRef.current = true;
    setHydrated(true);
  }, [initialState]);

  const handleApplyRemoteState = useCallback((remoteState: WatchlistState) => {
    setState(remoteState);
    saveWatchlistState(remoteState);
  }, []);

  useWatchlistLibraryRemoteSync({
    state,
    hydrated,
    onApplyRemoteState: handleApplyRemoteState,
  });

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveWatchlistState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const setStateUpdater = useCallback(
    (updater: (prev: WatchlistState) => WatchlistState) => {
      setState(updater);
    },
    [],
  );

  const value = useMemo(
    (): WatchlistContextValue => ({
      state,
      getState: () => state,
      setState: setStateUpdater,
    }),
    [state, setStateUpdater],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistActions(): WatchlistContextValue | null {
  return useContext(WatchlistContext);
}
