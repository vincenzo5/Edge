'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { VisibleRange } from '@edge/chart-core';
import { shouldSuppressPan } from '@edge/chart-core/drawingController';
import type { DrawingControllerState } from '@edge/chart-core/drawingController';
import {
  mergeWheelBatch,
  normalizeWheelDelta,
  zoomFactorForDelta,
} from '@edge/chart-core/wheel';
import { createPinchHandler } from '@edge/chart-core/pinch';
import type { ChartPaneHandle } from './engine/paneHandle';
import type { HistoryPrefetchController } from './engine/historyPrefetchController';

export type ChartWheelPinchDeps = {
  chartAreaRef: RefObject<HTMLDivElement | null>;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  syncSiblings: (startIndex: number, endIndex: number, sourcePaneId: string) => void;
  userPannedTimeAxisRef: RefObject<boolean>;
  prefetchControllerRef: RefObject<HistoryPrefetchController | null>;
  drawingFsmRef: RefObject<DrawingControllerState>;
};

export type ChartWheelPinch = {
  wheelingRef: RefObject<boolean>;
};

export function useChartWheelPinch(
  deps: ChartWheelPinchDeps,
  wheelingRef: RefObject<boolean>,
): ChartWheelPinch {
  const {
    chartAreaRef,
    paneHandlesRef,
    syncSiblings,
    userPannedTimeAxisRef,
    prefetchControllerRef,
    drawingFsmRef,
  } = deps;

  const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWheelRef = useRef<{ deltaX: number; deltaY: number; anchorX: number } | null>(null);
  const wheelRafRef = useRef<number | null>(null);

  const flushWheel = useCallback(() => {
    wheelRafRef.current = null;
    const batch = pendingWheelRef.current;
    pendingWheelRef.current = null;
    if (!batch) return;

    const priceHandle = paneHandlesRef.current?.get('price');
    if (!priceHandle) return;

    const action = mergeWheelBatch(batch.deltaX, batch.deltaY);
    if (action.type === 'none') return;

    let vp: VisibleRange | null = null;
    if (action.type === 'zoom') {
      const factor = zoomFactorForDelta(batch.deltaY);
      vp = priceHandle.applyWheelAction({ type: 'zoom', factor }, batch.anchorX);
    } else {
      if (action.type === 'pan') userPannedTimeAxisRef.current = true;
      vp = priceHandle.applyWheelAction(action, batch.anchorX);
    }

    if (vp) {
      syncSiblings(vp.startIndex, vp.endIndex, 'price');
      if (action.type === 'pan') {
        prefetchControllerRef.current?.maybePrefetch();
      }
    }
  }, [paneHandlesRef, prefetchControllerRef, syncSiblings, userPannedTimeAxisRef]);

  const applyPinchZoom = useCallback(
    (factor: number, anchorX: number) => {
      const priceHandle = paneHandlesRef.current?.get('price');
      if (!priceHandle) return;
      const vp = priceHandle.applyWheelAction({ type: 'zoom', factor }, anchorX);
      if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
    },
    [paneHandlesRef, syncSiblings],
  );

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      wheelingRef.current = true;
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
      wheelEndTimerRef.current = setTimeout(() => {
        wheelingRef.current = false;
      }, 120);

      const deltaX = normalizeWheelDelta(e.deltaX, e.deltaMode);
      const deltaY = normalizeWheelDelta(e.deltaY, e.deltaMode);
      const rect = el.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;

      if (!pendingWheelRef.current) {
        pendingWheelRef.current = { deltaX: 0, deltaY: 0, anchorX };
      }
      const pending = pendingWheelRef.current;
      pending.deltaX += deltaX;
      pending.deltaY += deltaY;
      pending.anchorX = anchorX;

      if (!wheelRafRef.current) {
        wheelRafRef.current = requestAnimationFrame(flushWheel);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
    };
  }, [chartAreaRef, flushWheel]);

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;

    const handler = createPinchHandler({
      onPinch: (action, anchorX) => {
        wheelingRef.current = true;
        if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
        wheelEndTimerRef.current = setTimeout(() => {
          wheelingRef.current = false;
        }, 120);
        applyPinchZoom(action.factor, anchorX);
      },
      shouldSuppress: () => shouldSuppressPan(drawingFsmRef.current),
      getContainerRect: () => el.getBoundingClientRect(),
    });

    el.addEventListener('pointerdown', handler.onPointerDown);
    el.addEventListener('pointermove', handler.onPointerMove);
    el.addEventListener('pointerup', handler.onPointerUp);
    el.addEventListener('pointercancel', handler.onPointerCancel);
    return () => {
      el.removeEventListener('pointerdown', handler.onPointerDown);
      el.removeEventListener('pointermove', handler.onPointerMove);
      el.removeEventListener('pointerup', handler.onPointerUp);
      el.removeEventListener('pointercancel', handler.onPointerCancel);
    };
  }, [applyPinchZoom, chartAreaRef, drawingFsmRef]);

  return { wheelingRef };
}
