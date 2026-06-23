"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  CellConfig,
  ChartLayout,
  ChartType,
  GridMode,
  SidebarPanelId,
  Theme,
} from "@/lib/chartConfig";
import type { AppActions } from "@/lib/ai/context";

export type AppActionsContextValue = AppActions;

const AppActionsContext = createContext<AppActionsContextValue | null>(null);

export function AppActionsProvider({
  value,
  children,
}: {
  value: AppActionsContextValue;
  children: ReactNode;
}) {
  const memo = useMemo(() => value, [value]);
  return (
    <AppActionsContext.Provider value={memo}>
      {children}
    </AppActionsContext.Provider>
  );
}

export function useAppActions(): AppActionsContextValue | null {
  return useContext(AppActionsContext);
}

export type AppActionsDeps = {
  layout: ChartLayout;
  hydrated: boolean;
  applyCellUpdate: (index: number, next: CellConfig) => void;
  patchActiveCell: (patch: Partial<CellConfig>) => void;
  setActiveCellIndex: (index: number) => void;
  setGridMode: (mode: GridMode) => void;
  setLinked: (linked: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSidebarPanel: (panel: SidebarPanelId | null) => void;
};

export function buildAppActions(deps: AppActionsDeps): AppActions {
  return {
    getLayout: () => deps.layout,
    isHydrated: () => deps.hydrated,
    applyCellUpdate: deps.applyCellUpdate,
    patchActiveCell: deps.patchActiveCell,
    setActiveCellIndex: deps.setActiveCellIndex,
    setGridMode: deps.setGridMode,
    setLinked: deps.setLinked,
    setTheme: (theme: Theme) => deps.setTheme(theme),
    setSidebarPanel: deps.setSidebarPanel,
  };
}
