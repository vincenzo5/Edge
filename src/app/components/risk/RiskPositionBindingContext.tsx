"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import {
  clearRiskPositionBindStorage,
  loadRiskPositionBindFromStorage,
  saveRiskPositionBindToStorage,
} from "@/lib/risk/riskPositionBinding";

export type RiskPositionBind = {
  cellId: string;
  drawingId: string;
};

export type RiskPositionLevels = Pick<
  PositionOrderLevels,
  "entry" | "stop" | "direction"
>;

type RiskPositionBindingContextValue = {
  bind: RiskPositionBind | null;
  levels: RiskPositionLevels | null;
  linked: boolean;
  bindToDrawing: (cellId: string, drawingId: string) => void;
  updateBoundLevels: (levels: PositionOrderLevels | null) => void;
  markManualOverride: () => void;
  relink: () => void;
  unlink: () => void;
};

const RiskPositionBindingContext = createContext<RiskPositionBindingContextValue | null>(
  null,
);

function toRiskLevels(levels: PositionOrderLevels | null): RiskPositionLevels | null {
  if (!levels) return null;
  return {
    entry: levels.entry,
    stop: levels.stop,
    direction: levels.direction,
  };
}

function levelsEqual(
  prev: RiskPositionLevels | null,
  next: RiskPositionLevels | null,
): boolean {
  if (prev == null && next == null) return true;
  if (prev == null || next == null) return false;
  return (
    prev.entry === next.entry &&
    prev.stop === next.stop &&
    prev.direction === next.direction
  );
}

function readInitialBindingState(): { bind: RiskPositionBind | null; linked: boolean } {
  const persisted = loadRiskPositionBindFromStorage();
  if (!persisted) {
    return { bind: null, linked: false };
  }
  return {
    bind: { cellId: persisted.cellId, drawingId: persisted.drawingId },
    linked: persisted.linked,
  };
}

export function RiskPositionBindingProvider({ children }: { children: ReactNode }) {
  const [bind, setBind] = useState<RiskPositionBind | null>(
    () => readInitialBindingState().bind,
  );
  const [levels, setLevels] = useState<RiskPositionLevels | null>(null);
  const [linked, setLinked] = useState(() => readInitialBindingState().linked);

  useEffect(() => {
    if (bind == null) {
      clearRiskPositionBindStorage();
      return;
    }
    saveRiskPositionBindToStorage({
      cellId: bind.cellId,
      drawingId: bind.drawingId,
      linked,
    });
  }, [bind, linked]);

  const bindToDrawing = useCallback((cellId: string, drawingId: string) => {
    setBind({ cellId, drawingId });
    setLinked(true);
    setLevels(null);
  }, []);

  const updateBoundLevels = useCallback((nextLevels: PositionOrderLevels | null) => {
    if (nextLevels == null) {
      setBind(null);
      setLinked(false);
      return;
    }
    const riskLevels = toRiskLevels(nextLevels);
    setLevels((prev) => {
      if (levelsEqual(prev, riskLevels)) return prev;
      return riskLevels;
    });
  }, []);

  const markManualOverride = useCallback(() => {
    setLinked(false);
  }, []);

  const relink = useCallback(() => {
    setLinked((prevLinked) => {
      if (bind == null) return prevLinked;
      return true;
    });
  }, [bind]);

  const unlink = useCallback(() => {
    setLinked(false);
    setBind(null);
    setLevels(null);
  }, []);

  const value = useMemo(
    () => ({
      bind,
      levels,
      linked,
      bindToDrawing,
      updateBoundLevels,
      markManualOverride,
      relink,
      unlink,
    }),
    [bind, levels, linked, bindToDrawing, updateBoundLevels, markManualOverride, relink, unlink],
  );

  return (
    <RiskPositionBindingContext.Provider value={value}>
      {children}
    </RiskPositionBindingContext.Provider>
  );
}

export function useRiskPositionBinding(): RiskPositionBindingContextValue {
  const ctx = useContext(RiskPositionBindingContext);
  if (!ctx) {
    throw new Error("useRiskPositionBinding must be used within RiskPositionBindingProvider");
  }
  return ctx;
}

export function useRiskPositionBindingOptional(): RiskPositionBindingContextValue | null {
  return useContext(RiskPositionBindingContext);
}
