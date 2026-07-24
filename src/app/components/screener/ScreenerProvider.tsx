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

import type { ScreenerState, PersistedScreenerSortSpec } from "@/lib/screener/types";
import {
  DEFAULT_SCREENER_STATE,
  applySortToActiveSavedScreen,
  ensureStarterScreens,
  loadScreenerState,
  patchScreenerState,
  saveScreenerState,
} from "@/lib/screener/screenStorage";
import {
  createDefaultScreenerSession,
  type ScreenerSessionState,
} from "@/lib/screener/screenerSession";
import {
  applyReviewResumeToSession,
  sanitizeReviewResumeOnLoad,
  syncReviewResumeOntoState,
} from "@/lib/screener/reviewResume";
import { useScreenerLibraryRemoteSync } from "@/lib/persistence/sync/useScreenerLibraryRemoteSync";

export type ScreenerContextValue = {
  state: ScreenerState;
  hydrated: boolean;
  setState: (updater: (prev: ScreenerState) => ScreenerState) => void;
  sort: PersistedScreenerSortSpec | null;
  setSort: (sort: PersistedScreenerSortSpec | null) => void;
  session: ScreenerSessionState;
  patchSession: (patch: Partial<ScreenerSessionState>) => void;
  setSession: (updater: (prev: ScreenerSessionState) => ScreenerSessionState) => void;
  /** @deprecated Use session.lastRun */
  lastRun: ScreenerSessionState["lastRun"];
  /** @deprecated Use session.lastRun via patchSession */
  setLastRun: (run: ScreenerSessionState["lastRun"]) => void;
  /** @deprecated Use session.visibleSymbols */
  screenerVisibleSymbols: string[];
  /** @deprecated Use patchSession */
  setScreenerVisibleSymbols: (symbols: string[]) => void;
  selectedCompareSymbols: string[];
  toggleCompareSymbol: (symbol: string) => void;
  clearCompareSelection: () => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
};

const ScreenerContext = createContext<ScreenerContextValue | null>(null);

export function ScreenerProvider({
  children,
  initialState,
  initialSession,
}: {
  children: ReactNode;
  initialState?: ScreenerState;
  initialSession?: ScreenerSessionState;
}) {
  const [state, setState] = useState<ScreenerState>(initialState ?? DEFAULT_SCREENER_STATE);
  const [session, setSessionState] = useState<ScreenerSessionState>(
    () => initialSession ?? createDefaultScreenerSession(initialState ?? DEFAULT_SCREENER_STATE),
  );
  const [hydrated, setHydrated] = useState(initialState != null);
  const hydratedRef = useRef(initialState != null);
  const reviewSnapshotRef = useRef("");

  useEffect(() => {
    if (initialState != null) {
      const seeded = sanitizeReviewResumeOnLoad(ensureStarterScreens(initialState));
      if (seeded !== initialState) setState(seeded);
      setSessionState((prev) =>
        applyReviewResumeToSession(seeded, prev ?? createDefaultScreenerSession(seeded)),
      );
      return;
    }
    const loaded = sanitizeReviewResumeOnLoad(ensureStarterScreens(loadScreenerState()));
    setState(loaded);
    setSessionState(applyReviewResumeToSession(loaded, createDefaultScreenerSession(loaded)));
    hydratedRef.current = true;
    setHydrated(true);
  }, [initialState]);

  const handleApplyRemoteState = useCallback((remoteState: ScreenerState) => {
    const seeded = sanitizeReviewResumeOnLoad(ensureStarterScreens(remoteState));
    setState(seeded);
    const nextSession = applyReviewResumeToSession(seeded, createDefaultScreenerSession(seeded));
    setSessionState(nextSession);
    reviewSnapshotRef.current = JSON.stringify({
      reviewIndex: nextSession.reviewIndex,
      keepers: nextSession.keepers,
      reviewActive: nextSession.reviewActive,
    });
    saveScreenerState(seeded);
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

  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot = JSON.stringify({
      reviewIndex: session.reviewIndex,
      keepers: session.keepers,
      reviewActive: session.reviewActive,
    });
    if (snapshot === reviewSnapshotRef.current) return;
    reviewSnapshotRef.current = snapshot;
    setState((prev) => syncReviewResumeOntoState(prev, session));
  }, [session.reviewIndex, session.keepers, session.reviewActive]);

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

  const patchSession = useCallback((patch: Partial<ScreenerSessionState>) => {
    setSessionState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setSession = useCallback(
    (updater: (prev: ScreenerSessionState) => ScreenerSessionState) => {
      setSessionState(updater);
    },
    [],
  );

  const resolvedSort = state.sort ?? null;

  const toggleCompareSymbol = useCallback((symbol: string) => {
    const key = symbol.trim().toUpperCase();
    if (!key) return;
    setSessionState((prev) => ({
      ...prev,
      compareSelection: prev.compareSelection.includes(key)
        ? prev.compareSelection.filter((entry) => entry !== key)
        : [...prev.compareSelection, key],
    }));
  }, []);

  const clearCompareSelection = useCallback(() => {
    patchSession({ compareSelection: [] });
  }, [patchSession]);

  const setCompareOpen = useCallback(
    (open: boolean) => {
      patchSession({ compareOpen: open });
    },
    [patchSession],
  );

  const setLastRun = useCallback(
    (run: ScreenerSessionState["lastRun"]) => {
      patchSession({ lastRun: run });
    },
    [patchSession],
  );

  const setScreenerVisibleSymbols = useCallback(
    (symbols: string[]) => {
      patchSession({ visibleSymbols: symbols });
    },
    [patchSession],
  );

  const value = useMemo(
    (): ScreenerContextValue => ({
      state,
      hydrated,
      setState: setStateUpdater,
      sort: resolvedSort,
      setSort,
      session,
      patchSession,
      setSession,
      lastRun: session.lastRun,
      setLastRun,
      screenerVisibleSymbols: session.visibleSymbols,
      setScreenerVisibleSymbols,
      selectedCompareSymbols: session.compareSelection,
      toggleCompareSymbol,
      clearCompareSelection,
      compareOpen: session.compareOpen,
      setCompareOpen,
    }),
    [
      state,
      hydrated,
      setStateUpdater,
      resolvedSort,
      setSort,
      session,
      patchSession,
      setSession,
      setLastRun,
      setScreenerVisibleSymbols,
      toggleCompareSymbol,
      clearCompareSelection,
      setCompareOpen,
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
