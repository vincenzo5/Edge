"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { ChartHandle } from "./EdgeChart";
import type { CellConfig } from "@/lib/chartConfig";
import {
  parseViewportPersistSketch,
  type ViewportPersistSketch,
} from "@/lib/chart/viewportPersistSketch";

const DEBOUNCE_MS = 500;

function viewportToSketch(
  vp: NonNullable<ReturnType<ChartHandle["getVisibleRange"]>>,
): ViewportPersistSketch {
  return {
    startIndex: vp.startIndex,
    endIndex: vp.endIndex,
    priceMin: vp.priceMin,
    priceMax: vp.priceMax,
    priceScaleMode: vp.priceScaleMode ?? "auto",
  };
}

function sketchFingerprint(sketch: ViewportPersistSketch | undefined): string {
  return sketch ? JSON.stringify(sketch) : "";
}
type Params = {
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  onConfigChange: (next: CellConfig) => void;
  candleCount: number;
  sessionKey: string;
  /** Bumps when the chart engine remounts so viewport restore runs again. */
  chartEngineGeneration?: number;
};

export function useViewportPersistSync({
  chartRef,
  config,
  onConfigChange,
  candleCount,
  sessionKey,
  chartEngineGeneration = 0,
}: Params) {
  const suppressPersistRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWrittenFingerprintRef = useRef(sketchFingerprint(config.viewport));
  const restoredForSessionRef = useRef<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const clearPersistedViewport = useCallback(() => {
    lastWrittenFingerprintRef.current = "";
    const current = configRef.current;
    if (current.viewport === undefined) return;
    onConfigChange({ ...current, viewport: undefined });
  }, [onConfigChange]);

  const writeViewportPersist = useCallback((chartOverride?: ChartHandle | null) => {
    if (suppressPersistRef.current) return;

    const chart = chartOverride ?? chartRef.current;
    const current = configRef.current;
    if (!chart) return;

    if (!chart.isViewportModified()) {
      if (current.viewport !== undefined) {
        lastWrittenFingerprintRef.current = "";
        onConfigChange({ ...current, viewport: undefined });
      }
      return;
    }

    const vp = chart.getVisibleRange();
    if (!vp) return;
    const sketch = viewportToSketch(vp);
    const fingerprint = sketchFingerprint(sketch);
    if (fingerprint === lastWrittenFingerprintRef.current) return;

    lastWrittenFingerprintRef.current = fingerprint;
    onConfigChange({ ...current, viewport: sketch });
  }, [chartRef, onConfigChange]);

  const flushViewportPersist = useCallback((chartOverride?: ChartHandle | null) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    writeViewportPersist(chartOverride);
  }, [writeViewportPersist]);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      writeViewportPersist();
    }, DEBOUNCE_MS);
  }, [writeViewportPersist]);

  const markViewportDirty = useCallback(() => {
    schedulePersist();
  }, [schedulePersist]);

  useEffect(() => {
    restoredForSessionRef.current = null;
  }, [sessionKey, chartEngineGeneration]);

  useEffect(() => {
    if (candleCount === 0) return;
    if (restoredForSessionRef.current === sessionKey) return;

    const snapshot = parseViewportPersistSketch(config.viewport);
    if (!snapshot) {
      restoredForSessionRef.current = sessionKey;
      return;
    }

    suppressPersistRef.current = true;
    const applied = chartRef.current?.applyViewportSnapshot(snapshot) ?? false;
    if (applied) {
      const fingerprint = sketchFingerprint(snapshot);
      lastWrittenFingerprintRef.current = fingerprint;
      restoredForSessionRef.current = sessionKey;
    } else {
      onConfigChange({ ...config, viewport: undefined });
      restoredForSessionRef.current = sessionKey;
    }

    window.setTimeout(() => {
      suppressPersistRef.current = false;
    }, 0);
  }, [candleCount, config, config.viewport, sessionKey, chartRef, onConfigChange]);

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
  );

  return {
    markViewportDirty,
    clearPersistedViewport,
    flushViewportPersist,
    suppressPersistRef,
  };
}

export { sketchFingerprint, viewportToSketch };
