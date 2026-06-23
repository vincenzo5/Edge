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
  loadWatchlistState,
  saveWatchlistState,
} from "@/lib/watchlist/storage";

export type WatchlistContextValue = WatchlistActions & {
  state: WatchlistState;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WatchlistState>(() => loadWatchlistState());
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = true;
  }, []);

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
