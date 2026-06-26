import type { MutableRefObject, RefObject } from 'react';
import { serializeChartState } from '@edge/chart-core';
import type { Candle, SerializedChartState } from '@edge/chart-core';
import type { GoToRequest, GoToResult } from './engine/goTo';
import type { ChartPaneHandle } from './engine/paneHandle';
import { mergeChartSettings, type ChartSettings } from './engine/chartSettings';
import type { EdgeChartHandle } from './types';
import type { DrawingHandleSlice } from './drawing/useDrawingController';

export type CreateEdgeChartHandleDeps = {
  stateRef: MutableRefObject<SerializedChartState>;
  dragHeightsRef: MutableRefObject<Record<string, number> | null>;
  drawingsRef: MutableRefObject<import('@edge/chart-core').SerializedDrawing[]>;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  chartAreaRef: RefObject<HTMLDivElement | null>;
  baseCandlesRef: MutableRefObject<Candle[]>;
  candlesRef: MutableRefObject<Candle[]>;
  crosshairCbsRef: MutableRefObject<Set<(ts: number | null) => void>>;
  syncSiblingsRef: MutableRefObject<(startIndex: number, endIndex: number, sourcePaneId: string) => void>;
  goToImplRef: MutableRefObject<(req: GoToRequest) => Promise<GoToResult>>;
  setDims: (dims: { width: number; height: number }) => void;
  hydrateDrawings: (data: import('@edge/chart-core').SerializedDrawing[]) => void;
  onStateChangeRef: MutableRefObject<((state: SerializedChartState) => void) | undefined>;
  applyCrosshairFromSync: (timestamp: number | null) => void;
  drawingHandleSlice: DrawingHandleSlice;
};

export function createEdgeChartHandle(deps: CreateEdgeChartHandleDeps): EdgeChartHandle {
  const {
    stateRef,
    dragHeightsRef,
    drawingsRef,
    paneHandlesRef,
    chartAreaRef,
    baseCandlesRef,
    candlesRef,
    crosshairCbsRef,
    syncSiblingsRef,
    goToImplRef,
    setDims,
    hydrateDrawings,
    onStateChangeRef,
    applyCrosshairFromSync,
    drawingHandleSlice,
  } = deps;

  return {
    ...drawingHandleSlice,
    getState: () =>
      serializeChartState({
        ...stateRef.current,
        drawings: drawingHandleSlice.serializeDrawings(),
        paneHeights: dragHeightsRef.current ?? stateRef.current.paneHeights,
      }),
    setState: (next: SerializedChartState) => {
      stateRef.current = next;
      hydrateDrawings(next.drawings);
      onStateChangeRef.current?.(next);
    },
    getVisibleRange: () => {
      const priceHandle = paneHandlesRef.current?.get('price');
      return priceHandle?.getViewport() ?? null;
    },
    setVisibleRange: (startIndex: number, endIndex: number) => {
      const priceHandle = paneHandlesRef.current?.get('price');
      const navigated = priceHandle?.navigateToViewport(startIndex, endIndex);
      if (navigated) {
        syncSiblingsRef.current(navigated.startIndex, navigated.endIndex, 'price');
      }
    },
    zoomIn: () => {
      const priceHandle = paneHandlesRef.current?.get('price');
      const el = chartAreaRef.current;
      if (!priceHandle || !el) return;
      const anchorX = el.clientWidth / 2;
      const vp = priceHandle.applyWheelAction({ type: 'zoom', factor: 1.25 }, anchorX);
      if (vp) syncSiblingsRef.current(vp.startIndex, vp.endIndex, 'price');
    },
    resize: () => {
      const el = chartAreaRef.current;
      if (el) setDims({ width: el.clientWidth, height: el.clientHeight });
    },
    onCrosshair: (cb) => {
      crosshairCbsRef.current.add(cb);
      return () => crosshairCbsRef.current.delete(cb);
    },
    setCrosshairFromSync: applyCrosshairFromSync,
    getSubPaneId: (key) => key,
    applyPaneHeights: () => {},
    resetChartView: () => {
      const priceHandle = paneHandlesRef.current?.get('price');
      if (!priceHandle) return;
      const vp = priceHandle.resetViewport();
      if (vp) {
        paneHandlesRef.current?.forEach((handle, id) => {
          if (id !== 'price') handle.syncTimeWindow(vp.startIndex, vp.endIndex, true);
        });
      }
      paneHandlesRef.current?.forEach((handle, id) => {
        if (id !== 'price') handle.resetViewport();
      });
    },
    resetPriceScaleWindow: (settingsOverride?: ChartSettings) => {
      const priceHandle = paneHandlesRef.current?.get('price');
      if (!priceHandle?.resetPriceScale) return;
      const merged = settingsOverride ?? mergeChartSettings(stateRef.current.chartSettings);
      const vp = priceHandle.resetPriceScale(merged);
      if (vp) {
        paneHandlesRef.current?.forEach((handle, id) => {
          if (id !== 'price') handle.syncTimeWindow(vp.startIndex, vp.endIndex, true);
        });
      }
      paneHandlesRef.current?.forEach((handle, id) => {
        if (id !== 'price') handle.resetPriceScale?.(merged);
      });
    },
    isViewportModified: () => {
      for (const handle of paneHandlesRef.current?.values() ?? []) {
        if (handle.isViewportModified()) return true;
      }
      return false;
    },
    getRawCandleCount: () => baseCandlesRef.current.length,
    getCandles: () => candlesRef.current,
    goTo: (req) => goToImplRef.current(req),
    getLastCandleTimestamp: () => {
      const base = baseCandlesRef.current;
      return base.length > 0 ? base[base.length - 1]!.t : null;
    },
    getLastDrawPhases: () =>
      paneHandlesRef.current?.get('price')?.getLastDrawPhases?.() ?? null,
  };
}
