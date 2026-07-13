"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SidebarPanelWidthContextValue = {
  panelWidth: number;
  viewportWidth: number;
  isExpanded: boolean;
  canExpand: boolean;
  expand: () => void;
  collapse: () => void;
};

const SidebarPanelWidthContext = createContext<SidebarPanelWidthContextValue | null>(null);

export function SidebarPanelWidthProvider({
  value,
  children,
}: {
  value: SidebarPanelWidthContextValue;
  children: ReactNode;
}) {
  return (
    <SidebarPanelWidthContext.Provider value={value}>
      {children}
    </SidebarPanelWidthContext.Provider>
  );
}

export function useSidebarPanelWidth(): SidebarPanelWidthContextValue | null {
  return useContext(SidebarPanelWidthContext);
}
