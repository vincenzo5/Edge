"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { SidebarPanelId } from "@/lib/chartConfig";

type SidebarContextValue = {
  activePanel: SidebarPanelId | null;
  openPanel: (id: SidebarPanelId) => void;
  togglePanel: (id: SidebarPanelId) => void;
  closePanel: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  activePanel,
  onActivePanelChange,
}: {
  children: React.ReactNode;
  activePanel: SidebarPanelId | null;
  onActivePanelChange: (id: SidebarPanelId | null) => void;
}) {
  const openPanel = useCallback(
    (id: SidebarPanelId) => {
      onActivePanelChange(id);
    },
    [onActivePanelChange],
  );

  const togglePanel = useCallback(
    (id: SidebarPanelId) => {
      onActivePanelChange(activePanel === id ? null : id);
    },
    [activePanel, onActivePanelChange],
  );

  const closePanel = useCallback(() => {
    onActivePanelChange(null);
  }, [onActivePanelChange]);

  const value = useMemo(
    () => ({ activePanel, openPanel, togglePanel, closePanel }),
    [activePanel, openPanel, togglePanel, closePanel],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}

export function useSidebarOptional(): SidebarContextValue | null {
  return useContext(SidebarContext);
}
