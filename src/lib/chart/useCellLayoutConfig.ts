"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CellConfig } from "@/lib/chartConfig";
import {
  getCellConfig,
  getCellRevision,
  subscribeCellConfig,
} from "./cellLayoutStore";

export function useCellLayoutConfig(chartId: string, fallback: CellConfig): CellConfig {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCellConfig(chartId, listener),
    [chartId],
  );
  const getSnapshot = useCallback(
    () => getCellConfig(chartId) ?? fallback,
    [chartId, fallback],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

export function useCellLayoutRevision(chartId: string): number {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCellConfig(chartId, listener),
    [chartId],
  );
  const getSnapshot = useCallback(() => getCellRevision(chartId), [chartId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
