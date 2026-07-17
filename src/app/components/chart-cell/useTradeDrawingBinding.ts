"use client";

import { useEffect, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";
import type { TrackedOverlay } from "@/lib/chartConfig";
import { positionOrderLevelsFromDrawing } from "@/lib/trading/positionTradeSetup";
import type { useTradeSetupBindingOptional } from "../trading/TradeSetupBindingContext";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  overlays: TrackedOverlay[];
  tradeBinding: ReturnType<typeof useTradeSetupBindingOptional>;
};

export function useTradeDrawingBinding({
  chartRef,
  chartId,
  overlays,
  tradeBinding,
}: Params) {
  const boundCellId = tradeBinding?.bind?.cellId ?? null;
  const boundDrawingId = tradeBinding?.bind?.drawingId ?? null;
  const updateBoundLevels = tradeBinding?.updateBoundLevels;

  useEffect(() => {
    if (!updateBoundLevels || !boundCellId || !boundDrawingId || boundCellId !== chartId) {
      return;
    }

    const drawings = chartRef.current?.serializeDrawings() ?? [];
    const drawing = drawings.find((item) => item.id === boundDrawingId);
    if (!drawing) {
      updateBoundLevels(null);
      return;
    }
    updateBoundLevels(positionOrderLevelsFromDrawing(drawing));
  }, [overlays, boundCellId, boundDrawingId, updateBoundLevels, chartId, chartRef]);
}
