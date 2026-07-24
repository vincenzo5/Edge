"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SymbolSelectResult } from "@/lib/watchlist/types";

export type ChartActionsContextValue = {
  activeCellSymbol: string;
  loadSymbolIntoActiveChart: (result: SymbolSelectResult) => void;
  addScriptIndicatorToActiveChart?: (params: {
    scriptId: string;
    revision: string;
    name: string;
    pane: "main" | "sub";
  }) => void;
};

const ChartActionsContext = createContext<ChartActionsContextValue | null>(null);

export function ChartActionsProvider({
  activeCellSymbol,
  loadSymbolIntoActiveChart,
  addScriptIndicatorToActiveChart,
  children,
}: ChartActionsContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ activeCellSymbol, loadSymbolIntoActiveChart, addScriptIndicatorToActiveChart }),
    [activeCellSymbol, loadSymbolIntoActiveChart, addScriptIndicatorToActiveChart],
  );

  return (
    <ChartActionsContext.Provider value={value}>
      {children}
    </ChartActionsContext.Provider>
  );
}

export function useChartActions(): ChartActionsContextValue | null {
  return useContext(ChartActionsContext);
}
