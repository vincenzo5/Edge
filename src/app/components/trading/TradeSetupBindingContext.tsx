"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import { useSidebar } from "../SidebarContext";

export type TradeSetupBind = {
  cellId: string;
  drawingId: string;
};

type TradeSetupBindingContextValue = {
  bind: TradeSetupBind | null;
  levels: PositionOrderLevels | null;
  symbol: string | null;
  openTradeFromDrawing: (cellId: string, drawingId: string, symbol: string) => void;
  openTradePanel: () => void;
  updateBoundLevels: (levels: PositionOrderLevels | null) => void;
};

const TradeSetupBindingContext = createContext<TradeSetupBindingContextValue | null>(
  null,
);

export function TradeSetupBindingProvider({ children }: { children: ReactNode }) {
  const { openPanel } = useSidebar();
  const [bind, setBind] = useState<TradeSetupBind | null>(null);
  const [levels, setLevels] = useState<PositionOrderLevels | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);

  const openTradeFromDrawing = useCallback(
    (cellId: string, drawingId: string, nextSymbol: string) => {
      setBind({ cellId, drawingId });
      setSymbol(nextSymbol.trim().toUpperCase());
      setLevels(null);
      openPanel("trade");
    },
    [openPanel],
  );

  const openTradePanel = useCallback(() => {
    setBind(null);
    setLevels(null);
    setSymbol(null);
    openPanel("trade");
  }, [openPanel]);

  const updateBoundLevels = useCallback((nextLevels: PositionOrderLevels | null) => {
    setLevels((prev) => {
      if (prev == null && nextLevels == null) return prev;
      if (
        prev != null &&
        nextLevels != null &&
        prev.direction === nextLevels.direction &&
        prev.side === nextLevels.side &&
        prev.entry === nextLevels.entry &&
        prev.stop === nextLevels.stop &&
        prev.target === nextLevels.target &&
        prev.riskRewardRatio === nextLevels.riskRewardRatio
      ) {
        return prev;
      }
      return nextLevels;
    });
  }, []);

  const value = useMemo(
    () => ({
      bind,
      levels,
      symbol,
      openTradeFromDrawing,
      openTradePanel,
      updateBoundLevels,
    }),
    [bind, levels, symbol, openTradeFromDrawing, openTradePanel, updateBoundLevels],
  );

  return (
    <TradeSetupBindingContext.Provider value={value}>
      {children}
    </TradeSetupBindingContext.Provider>
  );
}

export function useTradeSetupBinding(): TradeSetupBindingContextValue {
  const ctx = useContext(TradeSetupBindingContext);
  if (!ctx) {
    throw new Error("useTradeSetupBinding must be used within TradeSetupBindingProvider");
  }
  return ctx;
}

export function useTradeSetupBindingOptional(): TradeSetupBindingContextValue | null {
  return useContext(TradeSetupBindingContext);
}
