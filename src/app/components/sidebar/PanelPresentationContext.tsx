"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PanelPresentation } from "@/lib/chartConfig";

export type PanelPresentationContextValue = {
  presentation: PanelPresentation;
  popOut: () => void;
  dock: () => void;
  canPopOut: boolean;
  canDock: boolean;
};

const PanelPresentationContext = createContext<PanelPresentationContextValue | null>(null);

export function PanelPresentationProvider({
  value,
  children,
}: {
  value: PanelPresentationContextValue;
  children: ReactNode;
}) {
  return (
    <PanelPresentationContext.Provider value={value}>
      {children}
    </PanelPresentationContext.Provider>
  );
}

export function usePanelPresentation(): PanelPresentationContextValue | null {
  return useContext(PanelPresentationContext);
}
