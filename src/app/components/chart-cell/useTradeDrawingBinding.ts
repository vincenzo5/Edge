"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ChartHandle } from "./EdgeChart";
import type { TrackedOverlay } from "@/lib/chartConfig";
import {
  findNewPositionDrawingId,
  findPositionDrawingById,
  positionDrawingIds,
} from "@/lib/risk/riskPositionBinding";
import { positionOrderLevelsFromDrawing } from "@/lib/trading/positionTradeSetup";
import type { useSidebarOptional } from "../SidebarContext";
import type { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  symbol: string;
  overlays: TrackedOverlay[];
  isActive: boolean;
  sidebar: ReturnType<typeof useSidebarOptional>;
  tradeBinding: ReturnType<typeof useTradeSetupBindingOptional>;
};

export function useTradeDrawingBinding({
  chartRef,
  chartId,
  symbol,
  overlays,
  isActive,
  sidebar,
  tradeBinding,
}: Params) {
  const prevPositionIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const boundCellId = tradeBinding?.bind?.cellId ?? null;
  const boundDrawingId = tradeBinding?.bind?.drawingId ?? null;
  const bindToDrawing = tradeBinding?.bindToDrawing;
  const clearTradeBind = tradeBinding?.clearTradeBind;
  const updateBoundLevels = tradeBinding?.updateBoundLevels;

  useEffect(() => {
    if (!updateBoundLevels) return;

    const drawings = chartRef.current?.serializeDrawings() ?? [];
    const currentIds = positionDrawingIds(drawings);

    if (!initializedRef.current) {
      prevPositionIdsRef.current = currentIds;
      initializedRef.current = true;

      if (boundCellId === chartId && boundDrawingId) {
        const drawing = findPositionDrawingById(drawings, boundDrawingId);
        if (drawing) {
          updateBoundLevels(positionOrderLevelsFromDrawing(drawing));
        }
      }
      return;
    }

    if (
      isActive &&
      sidebar?.activePanel === "trade" &&
      tradeBinding?.bind == null &&
      bindToDrawing
    ) {
      const newId = findNewPositionDrawingId(prevPositionIdsRef.current, drawings);
      if (newId) {
        bindToDrawing(chartId, newId, symbol);
        const drawing = drawings.find((item) => item.id === newId);
        updateBoundLevels(
          drawing ? positionOrderLevelsFromDrawing(drawing) : null,
        );
        prevPositionIdsRef.current = currentIds;
        return;
      }
    }

    prevPositionIdsRef.current = currentIds;

    if (!boundCellId || !boundDrawingId || boundCellId !== chartId) {
      return;
    }

    const drawing = findPositionDrawingById(drawings, boundDrawingId);
    if (!drawing) {
      clearTradeBind?.();
      return;
    }

    updateBoundLevels(positionOrderLevelsFromDrawing(drawing));
  }, [
    overlays,
    isActive,
    sidebar?.activePanel,
    tradeBinding?.bind,
    boundCellId,
    boundDrawingId,
    bindToDrawing,
    clearTradeBind,
    updateBoundLevels,
    chartId,
    chartRef,
    symbol,
  ]);
}
