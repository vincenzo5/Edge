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

export type OpenTradeFromDrawingOptions = {
  seedQuantity?: number;
};

type TradeSetupBindingContextValue = {
  bind: TradeSetupBind | null;
  levels: PositionOrderLevels | null;
  symbol: string | null;
  seedQuantity: number | null;
  openTradeFromDrawing: (
    cellId: string,
    drawingId: string,
    symbol: string,
    options?: OpenTradeFromDrawingOptions,
  ) => void;
  bindToDrawing: (cellId: string, drawingId: string, symbol: string) => void;
  openTradePanel: () => void;
  clearTradeBind: () => void;
  clearSeedQuantity: () => void;
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
  const [seedQuantity, setSeedQuantity] = useState<number | null>(null);

  const openTradeFromDrawing = useCallback(
    (
      cellId: string,
      drawingId: string,
      nextSymbol: string,
      options?: OpenTradeFromDrawingOptions,
    ) => {
      setBind({ cellId, drawingId });
      setSymbol(nextSymbol.trim().toUpperCase());
      setLevels(null);
      const nextSeed = options?.seedQuantity;
      setSeedQuantity(
        nextSeed != null && Number.isFinite(nextSeed) && nextSeed > 0 ? nextSeed : null,
      );
      openPanel("trade");
    },
    [openPanel],
  );

  const bindToDrawing = useCallback((cellId: string, drawingId: string, nextSymbol: string) => {
    setBind({ cellId, drawingId });
    setSymbol(nextSymbol.trim().toUpperCase());
    setLevels(null);
    setSeedQuantity(null);
  }, []);

  const clearTradeBind = useCallback(() => {
    setBind(null);
    setLevels(null);
    setSymbol(null);
    setSeedQuantity(null);
  }, []);

  const openTradePanel = useCallback(() => {
    clearTradeBind();
    openPanel("trade");
  }, [clearTradeBind, openPanel]);

  const clearSeedQuantity = useCallback(() => {
    setSeedQuantity(null);
  }, []);

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
      seedQuantity,
      openTradeFromDrawing,
      bindToDrawing,
      openTradePanel,
      clearTradeBind,
      clearSeedQuantity,
      updateBoundLevels,
    }),
    [
      bind,
      levels,
      symbol,
      seedQuantity,
      openTradeFromDrawing,
      bindToDrawing,
      openTradePanel,
      clearTradeBind,
      clearSeedQuantity,
      updateBoundLevels,
    ],
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
