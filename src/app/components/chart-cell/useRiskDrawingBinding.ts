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
import type { useRiskPositionBindingOptional } from "../risk/RiskPositionBindingContext";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  overlays: TrackedOverlay[];
  isActive: boolean;
  riskBinding: ReturnType<typeof useRiskPositionBindingOptional>;
};

export function useRiskDrawingBinding({
  chartRef,
  chartId,
  overlays,
  isActive,
  riskBinding,
}: Params) {
  const prevPositionIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const boundCellId = riskBinding?.bind?.cellId ?? null;
  const boundDrawingId = riskBinding?.bind?.drawingId ?? null;
  const linked = riskBinding?.linked ?? false;
  const bindToDrawing = riskBinding?.bindToDrawing;
  const updateBoundLevels = riskBinding?.updateBoundLevels;

  useEffect(() => {
    if (!bindToDrawing || !updateBoundLevels) return;

    const drawings = chartRef.current?.serializeDrawings() ?? [];
    const currentIds = positionDrawingIds(drawings);

    if (!initializedRef.current) {
      prevPositionIdsRef.current = currentIds;
      initializedRef.current = true;

      if (boundCellId === chartId && boundDrawingId && linked) {
        const drawing = findPositionDrawingById(drawings, boundDrawingId);
        if (drawing) {
          updateBoundLevels(positionOrderLevelsFromDrawing(drawing));
        }
      }
      return;
    }

    if (isActive) {
      const newId = findNewPositionDrawingId(prevPositionIdsRef.current, drawings);
      if (newId) {
        bindToDrawing(chartId, newId);
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
      updateBoundLevels(null);
      return;
    }

    if (!linked) {
      return;
    }

    updateBoundLevels(positionOrderLevelsFromDrawing(drawing));
  }, [
    overlays,
    isActive,
    linked,
    boundCellId,
    boundDrawingId,
    bindToDrawing,
    updateBoundLevels,
    chartId,
    chartRef,
  ]);
}
