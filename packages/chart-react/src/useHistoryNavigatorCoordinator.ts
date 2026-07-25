import { useCallback, useEffect, useRef } from 'react';
import type { Candle, ChartHistoryExtent, VisibleRange } from '@edge/chart-core';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import {
  computeHistoryNavigatorGeometry,
  HISTORY_NAVIGATOR_FADE_MS,
} from './historyNavigator';
import type { HistoryNavigatorOverlayHandle } from './components/HistoryNavigatorOverlay';

type Params = {
  enabled: boolean;
  historyExtent: ChartHistoryExtent | null | undefined;
  candles: Candle[];
  width: number;
  priceScaleSide: PriceScaleSide;
  viewportRevision?: string;
  latestVpRef: React.RefObject<VisibleRange | null>;
  wheelingRef: React.RefObject<boolean>;
  overlayRef: React.RefObject<HistoryNavigatorOverlayHandle | null>;
};

export function useHistoryNavigatorCoordinator({
  enabled,
  historyExtent,
  candles,
  width,
  priceScaleSide,
  viewportRevision,
  latestVpRef,
  wheelingRef,
  overlayRef,
}: Params) {
  const seededRef = useRef(false);
  const lastWindowRef = useRef<{ start: number; end: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const resetSession = useCallback(() => {
    seededRef.current = false;
    lastWindowRef.current = null;
    overlayRef.current?.hideImmediate();
  }, [overlayRef]);

  useEffect(() => {
    resetSession();
  }, [viewportRevision, resetSession]);

  const paint = useCallback(
    (reveal: boolean) => {
      if (!enabled || !historyExtent) {
        overlayRef.current?.hideImmediate();
        return;
      }
      const vp = latestVpRef.current;
      const geometry = computeHistoryNavigatorGeometry(
        historyExtent,
        candles,
        vp,
        width,
        priceScaleSide,
      );
      if (!geometry || !reveal) {
        overlayRef.current?.hideImmediate();
        return;
      }
      overlayRef.current?.applyGeometry(geometry, true);
      overlayRef.current?.scheduleFade(
        wheelingRef.current ? HISTORY_NAVIGATOR_FADE_MS + 120 : HISTORY_NAVIGATOR_FADE_MS,
      );
    },
    [enabled, historyExtent, candles, width, priceScaleSide, latestVpRef, wheelingRef, overlayRef],
  );

  const onViewportChange = useCallback(
    (vp: VisibleRange) => {
      if (!enabled) return;

      if (!seededRef.current) {
        seededRef.current = true;
        lastWindowRef.current = { start: vp.startIndex, end: vp.endIndex };
        return;
      }

      const prev = lastWindowRef.current;
      lastWindowRef.current = { start: vp.startIndex, end: vp.endIndex };
      if (
        prev &&
        Math.abs(prev.start - vp.startIndex) < 1e-6 &&
        Math.abs(prev.end - vp.endIndex) < 1e-6
      ) {
        return;
      }

      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        paint(true);
      });
    },
    [enabled, paint],
  );

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { onViewportChange, resetSession };
}
