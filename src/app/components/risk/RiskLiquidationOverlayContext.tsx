"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HoldToStopVerdict } from "@/lib/risk/marginContext";

export type RiskLiquidationOverlay = {
  price: number;
  verdict: HoldToStopVerdict;
};

type RiskLiquidationOverlayContextValue = {
  overlay: RiskLiquidationOverlay | null;
  setOverlay: (overlay: RiskLiquidationOverlay | null) => void;
};

const RiskLiquidationOverlayContext =
  createContext<RiskLiquidationOverlayContextValue | null>(null);

export function RiskLiquidationOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlayState] = useState<RiskLiquidationOverlay | null>(null);

  const setOverlay = useCallback((next: RiskLiquidationOverlay | null) => {
    setOverlayState((prev) => {
      if (prev == null && next == null) return prev;
      if (
        prev != null &&
        next != null &&
        prev.price === next.price &&
        prev.verdict === next.verdict
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ overlay, setOverlay }),
    [overlay, setOverlay],
  );

  return (
    <RiskLiquidationOverlayContext.Provider value={value}>
      {children}
    </RiskLiquidationOverlayContext.Provider>
  );
}

export function useRiskLiquidationOverlay(): RiskLiquidationOverlayContextValue {
  const ctx = useContext(RiskLiquidationOverlayContext);
  if (!ctx) {
    throw new Error(
      "useRiskLiquidationOverlay must be used within RiskLiquidationOverlayProvider",
    );
  }
  return ctx;
}

export function useRiskLiquidationOverlayOptional(): RiskLiquidationOverlay | null {
  return useContext(RiskLiquidationOverlayContext)?.overlay ?? null;
}
