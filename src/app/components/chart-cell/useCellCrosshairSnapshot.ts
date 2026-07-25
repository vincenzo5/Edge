"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getCellCrosshair,
  subscribeCellCrosshair,
  type CellCrosshairData,
} from "@/lib/chart/cellCrosshairStore";

export function useCellCrosshairSnapshot(chartId: string): CellCrosshairData {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCellCrosshair(chartId, listener),
    [chartId],
  );
  const getSnapshot = useCallback(() => getCellCrosshair(chartId), [chartId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => getCellCrosshair(chartId));
}
