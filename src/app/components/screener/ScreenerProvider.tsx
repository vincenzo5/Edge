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

import type { ScreenerSortSpec, ScreenerState, ScreenerLastRun, PersistedScreenerSortSpec } from "@/lib/screener/types";
import {
  DEFAULT_SCREENER_STATE,
  applySortToActiveSavedScreen,
  loadScreenerState,
  patchScreenerState,
  saveScreenerState,
} from "@/lib/screener/screenStorage";
import { useScreenerLibraryRemoteSync } from "@/lib/persistence/sync/useScreenerLibraryRemoteSync";

export type ScreenerContextValue = {
  state: ScreenerState;
  hydrated: boolean;
  setState: (updater: (prev: ScreenerState) => ScreenerState) => void;
  sort: PersistedScreenerSortSpec | null;
  setSort: (sort: PersistedScreenerSortSpec | null) => void;
  /** Visible result symbols for live quote streaming (max 32). */
  screenerVisibleSymbols: string[];
  setScreenerVisibleSymbols: (symbols: string[]) => void;
  lastRun: ScreenerLastRun | null;
  setLastRun: (run: ScreenerLastRun | null) => void;
  selectedCompareSymbols: string[];
  toggleCompareSymbol: (symbol: string) => void;
  clearCompareSelection: () => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
};

const ScreenerContext = createContext<ScreenerContextValue | null>(null);

export function ScreenerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenerState>(DEFAULT_SCREENER_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [screenerVisibleSymbols, setScreenerVisibleSymbols] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<ScreenerLastRun | null>(null);
  const [selectedCompareSymbols, setSelectedCompareSymbols] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setState(loadScreenerState());
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  const handleApplyRemoteState = useCallback((remoteState: ScreenerState) => {
    setState(remoteState);
    saveScreenerState(remoteState);
  }, []);

  useScreenerLibraryRemoteSync({
    state,
    hydrated,
    onApplyRemoteState: handleApplyRemoteState,
  });

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(() => saveScreenerState(state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const setStateUpdater = useCallback(
    (updater: (prev: ScreenerState) => ScreenerState) => {
      setState(updater);
    },
    [],
  );

  const setSort = useCallback((sort: PersistedScreenerSortSpec | null) => {
    setState((prev) => {
      const patched = patchScreenerState(prev, { sort });
      return applySortToActiveSavedScreen(patched, sort);
    });
  }, []);

  const resolvedSort = state.sort ?? null;

  const toggleCompareSymbol = useCallback((symbol: string) => {
    const key = symbol.trim().toUpperCase();
    if (!key) return;
    setSelectedCompareSymbols((prev) =>
      prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key],
    );
  }, []);

  const clearCompareSelection = useCallback(() => {
    setSelectedCompareSymbols([]);
  }, []);

  const value = useMemo(
    (): ScreenerContextValue => ({
      state,
      hydrated,
      setState: setStateUpdater,
      sort: resolvedSort,
      setSort,
      screenerVisibleSymbols,
      setScreenerVisibleSymbols,
      lastRun,
      setLastRun,
      selectedCompareSymbols,
      toggleCompareSymbol,
      clearCompareSelection,
      compareOpen,
      setCompareOpen,
    }),
    [
      state,
      hydrated,
      setStateUpdater,
      resolvedSort,
      setSort,
      screenerVisibleSymbols,
      lastRun,
      selectedCompareSymbols,
      toggleCompareSymbol,
      clearCompareSelection,
      compareOpen,
    ],
  );

  return <ScreenerContext.Provider value={value}>{children}</ScreenerContext.Provider>;
}

export function useScreenerState(): ScreenerContextValue {
  const ctx = useContext(ScreenerContext);
  if (!ctx) {
    throw new Error("useScreenerState must be used within ScreenerProvider");
  }
  return ctx;
}

export function useScreenerStateOptional(): ScreenerContextValue | null {
  return useContext(ScreenerContext);
}
