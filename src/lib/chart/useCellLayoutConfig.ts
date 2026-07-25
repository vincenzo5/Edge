"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { CellConfig } from "@/lib/chartConfig";
import {
  getCellConfig,
  getCellRevision,
  subscribeCellConfig,
} from "./cellLayoutStore";

export function useCellLayoutConfig(chartId: string, fallback: CellConfig): CellConfig {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const cacheRef = useRef<{ revision: number; config: CellConfig }>({
    revision: -1,
    config: fallback,
  });

  const subscribe = useCallback(
    (listener: () => void) => subscribeCellConfig(chartId, listener),
    [chartId],
  );

  const getSnapshot = useCallback(() => {
    const revision = getCellRevision(chartId);
    const stored = getCellConfig(chartId);
    const cached = cacheRef.current;

    if (stored) {
      if (cached.revision === revision && cached.config === stored) {
        return cached.config;
      }
      cacheRef.current = { revision, config: stored };
      return stored;
    }

    // Pre-hydration: keep a stable fallback reference for useSyncExternalStore.
    if (cached.revision === -1) {
      return cached.config;
    }

    cacheRef.current = { revision: -1, config: fallbackRef.current };
    return cacheRef.current.config;
  }, [chartId]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackRef.current);
}

export function useCellLayoutRevision(chartId: string): number {
  const subscribe = useCallback(
    (listener: () => void) => subscribeCellConfig(chartId, listener),
    [chartId],
  );
  const getSnapshot = useCallback(() => getCellRevision(chartId), [chartId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
