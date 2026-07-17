"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAppActions } from "../AppActionsContext";

export type PatternChartGotoRequest = {
  symbol: string;
  atMs: number;
};

type PatternLibraryContextValue = {
  pendingRecordId: string | null;
  openPatternsPanel: (recordId?: string) => void;
  consumePendingRecordId: () => string | null;
  chartGoto: PatternChartGotoRequest | null;
  requestChartGoto: (request: PatternChartGotoRequest) => void;
  consumeChartGoto: () => PatternChartGotoRequest | null;
};

const PatternLibraryContext = createContext<PatternLibraryContextValue | null>(null);

export function PatternLibraryProvider({ children }: { children: ReactNode }) {
  const appActions = useAppActions();
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [chartGoto, setChartGoto] = useState<PatternChartGotoRequest | null>(null);

  const openPatternsPanel = useCallback(
    (recordId?: string) => {
      if (recordId) setPendingRecordId(recordId);
      appActions?.setSidebarPanel("patterns");
    },
    [appActions],
  );

  const consumePendingRecordId = useCallback(() => {
    const value = pendingRecordId;
    setPendingRecordId(null);
    return value;
  }, [pendingRecordId]);

  const requestChartGoto = useCallback((request: PatternChartGotoRequest) => {
    setChartGoto({
      symbol: request.symbol.toUpperCase(),
      atMs: request.atMs,
    });
  }, []);

  const consumeChartGoto = useCallback(() => {
    const value = chartGoto;
    setChartGoto(null);
    return value;
  }, [chartGoto]);

  const value = useMemo(
    () => ({
      pendingRecordId,
      openPatternsPanel,
      consumePendingRecordId,
      chartGoto,
      requestChartGoto,
      consumeChartGoto,
    }),
    [
      pendingRecordId,
      openPatternsPanel,
      consumePendingRecordId,
      chartGoto,
      requestChartGoto,
      consumeChartGoto,
    ],
  );

  return (
    <PatternLibraryContext.Provider value={value}>
      {children}
    </PatternLibraryContext.Provider>
  );
}

export function usePatternLibrary(): PatternLibraryContextValue {
  const ctx = useContext(PatternLibraryContext);
  if (!ctx) {
    throw new Error("usePatternLibrary must be used within PatternLibraryProvider");
  }
  return ctx;
}

export function usePatternLibraryOptional(): PatternLibraryContextValue | null {
  return useContext(PatternLibraryContext);
}

export function usePatternChartGoto(symbol: string): {
  gotoMs: number | null;
  consumeGoto: () => number | null;
} {
  const ctx = usePatternLibraryOptional();
  const normalized = symbol.toUpperCase();
  const goto = ctx?.chartGoto;
  const active =
    goto != null && goto.symbol.toUpperCase() === normalized;

  return {
    gotoMs: active ? goto.atMs : null,
    consumeGoto: () => {
      if (!ctx || !active) return null;
      const next = ctx.consumeChartGoto();
      return next?.atMs ?? null;
    },
  };
}
