"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SidebarPanelWidthContextValue = {
  panelWidth: number;
  /**
   * Right inset (px) for the chart grid when a docked overlay panel is open.
   * Includes live resize preview so candles stay clear while dragging.
   */
  overlayInsetPx: number;
  /** Preview width while resizing; pass `null` to clear. */
  setWidthPreview: (width: number | null) => void;
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
