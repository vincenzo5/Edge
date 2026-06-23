"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SymbolSelectResult } from "@/lib/watchlist/types";

export type ChartActionsContextValue = {
  activeCellSymbol: string;
  loadSymbolIntoActiveChart: (result: SymbolSelectResult) => void;
};

const ChartActionsContext = createContext<ChartActionsContextValue | null>(null);

export function ChartActionsProvider({
  activeCellSymbol,
  loadSymbolIntoActiveChart,
  children,
}: ChartActionsContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ activeCellSymbol, loadSymbolIntoActiveChart }),
    [activeCellSymbol, loadSymbolIntoActiveChart],
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
