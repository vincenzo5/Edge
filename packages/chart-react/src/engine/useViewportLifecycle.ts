import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type {
  Candle,
  VisibleRange,
  IndicatorConfig,
  Interval,
  ChartEventMarker,
} from '@edge/chart-core';
import type { WheelAction } from '@edge/chart-core/wheel';
import type { ChartSettings } from './chartSettings';
import { mergeChartSettings, resolvePriceScaleSide } from './chartSettings';
import {
  createViewport,
  pan as panVp,
  zoom as zoomVp,
  attachViewportHelpers,
  refreshViewportForDataChange,
  getDefaultViewport,
  isViewportModified as isViewportModifiedFn,
  withPriceScaleContext,
  ensureRightMarginBars,
  applyPriceScaleLayout,
} from './viewport';
import { applyPanePriceScale, resetPanePriceScale } from './indicatorScale';
import { getSessionViewport } from './rangePresets';
import type { RegisterPane } from './paneHandle';
import type { DrawInvalidationReason } from './renderScheduler';
import type { RenderScheduler } from './renderScheduler';

type ViewportLifecycleParams = {
  candles: Candle[];
  width: number;
  height: number;
  paneId: string;
  showTimeAxis: boolean;
  viewportRevision?: string;
  rangePreset: import('@edge/chart-core').Range | null;
  interval?: Interval;
  chartSettings: ReturnType<typeof mergeChartSettings>;
  isPricePane: boolean;
  eventMarkers: ChartEventMarker[];
  indicators: IndicatorConfig[];
  livePrice: number | null;
  registerPane?: RegisterPane;
  onViewportChange?: (vp: VisibleRange, paneId: string) => void;
  drawRef: RefObject<(reason?: DrawInvalidationReason) => void>;
  vpRef: RefObject<VisibleRange | null>;
  isDraggingRef: RefObject<boolean>;
  schedulerRef: RefObject<RenderScheduler | null>;
  onUserTimePanRef: RefObject<(() => void) | undefined>;
};

export function useViewportLifecycle({
  candles,
  width,
  height,
  paneId,
  showTimeAxis,
  viewportRevision,
  rangePreset,
  interval,
  chartSettings,
  isPricePane,
  eventMarkers,
  indicators,
  livePrice,
  registerPane,
  onViewportChange,
  drawRef,
  vpRef,
  isDraggingRef,
  schedulerRef,
  onUserTimePanRef,
}: ViewportLifecycleParams) {
  const priceScaleSide = resolvePriceScaleSide(chartSettings.scales.priceScalePlacement);
  const prevDimsRef = useRef({ width: 0, height: 0 });
  const prevCandleCountRef = useRef(0);
  const prevViewportRevisionRef = useRef<string | undefined>(undefined);

  const layoutViewport = useCallback(
    (vp: VisibleRange) =>
      applyPriceScaleLayout(vp, {
        invert: paneId === 'price' && chartSettings.scales.invertPriceScale,
        side: paneId === 'price' ? priceScaleSide : 'right',
      }),
    [chartSettings.scales.invertPriceScale, paneId, priceScaleSide],
  );

  const emitViewport = useCallback(
    (vp: VisibleRange) => {
      onViewportChange?.(vp, paneId);
    },
    [onViewportChange, paneId],
  );

  const fitPriceScale = useCallback(
    (vp: VisibleRange) =>
      applyPanePriceScale(vp, candles, paneId, indicators, chartSettings, livePrice),
    [candles, paneId, indicators, chartSettings, livePrice],
  );

  const fitPriceScaleIfAuto = useCallback(
    (vp: VisibleRange, settingsOverride?: ChartSettings) => {
      if ((vp.priceScaleMode ?? 'auto') === 'manual') return vp;
      const settings = settingsOverride ?? chartSettings;
      let next = vp;
      if (isPricePane) {
        next = attachViewportHelpers(
          withPriceScaleContext(next, candles, settings),
          candles.length,
        );
      }
      return fitPriceScale(next);
    },
    [fitPriceScale, isPricePane, candles, chartSettings],
  );

  const buildSessionViewport = useCallback(() => {
    let vp = isPricePane
      ? getSessionViewport(candles, width, height, rangePreset ?? null, interval)
      : getDefaultViewport(candles, width, height);
    vp = attachViewportHelpers(
      {
        ...vp,
        reserveTimeAxis: showTimeAxis,
        reserveEventRail: isPricePane && eventMarkers.length > 0 && showTimeAxis,
      },
      candles.length,
    );
    return fitPriceScaleIfAuto(vp);
  }, [
    candles,
    width,
    height,
    rangePreset,
    interval,
    isPricePane,
    showTimeAxis,
    eventMarkers.length,
    fitPriceScaleIfAuto,
  ]);

  useLayoutEffect(() => {
    if (candles.length === 0) return;

    const revisionChanged =
      viewportRevision != null &&
      prevViewportRevisionRef.current !== viewportRevision;
    if (viewportRevision != null) {
      prevViewportRevisionRef.current = viewportRevision;
    }

    const prev = prevDimsRef.current;
    const dimsChanged = prev.width !== width || prev.height !== height;

    if (isPricePane && revisionChanged) {
      const vp = buildSessionViewport();
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current?.('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (!vpRef.current) {
      const vp = buildSessionViewport();
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current?.('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (dimsChanged) {
      let vp = refreshViewportForDataChange(vpRef.current, candles, width, height);
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current?.('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (
      !revisionChanged &&
      candles.length > prevCandleCountRef.current &&
      prevCandleCountRef.current > 0
    ) {
      const prevCount = prevCandleCountRef.current;
      const wasAtLiveEdge = vpRef.current.endIndex >= prevCount - 0.5;
      const stillAtLiveEdge = vpRef.current.endIndex >= candles.length - 0.5;

      if (isPricePane && wasAtLiveEdge && !stillAtLiveEdge) {
        const vp = buildSessionViewport();
        vpRef.current = vp;
        emitViewport(vp);
        drawRef.current?.('data');
      } else {
        let vp = attachViewportHelpers({ ...vpRef.current }, candles.length);
        vp = fitPriceScaleIfAuto(vp);
        vpRef.current = vp;
        drawRef.current?.('data');
      }
    }
    prevCandleCountRef.current = candles.length;
  }, [
    candles,
    width,
    height,
    fitPriceScaleIfAuto,
    showTimeAxis,
    viewportRevision,
    rangePreset,
    isPricePane,
    chartSettings.scales.priceScaleType,
    buildSessionViewport,
    drawRef,
    emitViewport,
    vpRef,
  ]);

  useEffect(() => {
    if (!vpRef.current || candles.length === 0) return;
    const reserveTime = showTimeAxis;
    const reserveRail = isPricePane && eventMarkers.length > 0 && showTimeAxis;
    if (
      (vpRef.current.reserveTimeAxis ?? true) === reserveTime &&
      (vpRef.current.reserveEventRail ?? false) === reserveRail
    ) {
      return;
    }
    vpRef.current = attachViewportHelpers(
      {
        ...vpRef.current,
        reserveTimeAxis: reserveTime,
        reserveEventRail: reserveRail,
      },
      candles.length,
    );
    drawRef.current?.('settings');
  }, [showTimeAxis, eventMarkers.length, candles.length, isPricePane, drawRef, vpRef]);

  useLayoutEffect(() => {
    if (!registerPane) return;

    const syncTimeWindow = (startIndex: number, endIndex: number, force = false) => {
      if (!vpRef.current || (!force && isDraggingRef.current)) return;
      const vp = vpRef.current;
      if (vp.startIndex === startIndex && vp.endIndex === endIndex) return;
      let next = { ...vp, startIndex, endIndex } as VisibleRange;
      next = attachViewportHelpers(next, candles.length);
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      drawRef.current?.('viewport');
    };

    const navigateToViewport = (startIndex: number, endIndex: number): VisibleRange | null => {
      if (!vpRef.current || candles.length === 0) return null;
      let next = { ...vpRef.current, startIndex, endIndex } as VisibleRange;
      next = attachViewportHelpers(next, candles.length);
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      drawRef.current?.('viewport');
      emitViewport(next);
      return next;
    };

    const applyWheelAction = (action: WheelAction, anchorX: number): VisibleRange | null => {
      if (!vpRef.current || candles.length === 0) return null;
      let vp = vpRef.current;
      if (action.type === 'zoom') {
        vp = zoomVp(vp, action.factor, anchorX, candles.length);
      } else if (action.type === 'pan') {
        onUserTimePanRef.current?.();
        vp = panVp(vp, action.deltaX, candles.length);
      } else {
        return vp;
      }
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      drawRef.current?.('viewport');
      emitViewport(vp);
      return vp;
    };

    const resetViewport = (): VisibleRange | null => {
      if (candles.length === 0 || !vpRef.current) return null;
      let next: VisibleRange;
      if (paneId === 'price') {
        next = attachViewportHelpers(
          {
            ...getSessionViewport(candles, width, height, rangePreset ?? null, interval),
            reserveTimeAxis: showTimeAxis,
            reserveEventRail: eventMarkers.length > 0 && showTimeAxis,
          },
          candles.length,
        );
      } else {
        next = resetPanePriceScale(vpRef.current, candles, paneId, indicators, chartSettings);
      }
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      emitViewport(next);
      drawRef.current?.('viewport');
      return next;
    };

    const resetPriceScale = (settingsOverride?: ChartSettings): VisibleRange | null => {
      if (candles.length === 0 || !vpRef.current) return null;
      let next = vpRef.current;
      if (isPricePane) {
        next = attachViewportHelpers(
          ensureRightMarginBars(
            { ...next, priceScaleMode: 'auto' },
            candles.length,
            width,
            chartSettings.canvas.marginRightBars,
          ),
          candles.length,
        );
      } else {
        next = resetPanePriceScale(
          { ...next, priceScaleMode: 'auto' } as VisibleRange,
          candles,
          paneId,
          indicators,
          settingsOverride ? mergeChartSettings(settingsOverride) : chartSettings,
        );
      }
      next = fitPriceScaleIfAuto(next, settingsOverride);
      vpRef.current = next;
      emitViewport(next);
      drawRef.current?.('settings');
      return next;
    };

    const isViewportModified = (): boolean => {
      if (!vpRef.current || candles.length === 0) return false;
      const baseline = isPricePane
        ? getSessionViewport(candles, width, height, rangePreset ?? null, interval)
        : getDefaultViewport(candles, width, height);
      return isViewportModifiedFn(
        vpRef.current,
        candles,
        width,
        height,
        (vp) => {
          const auto = fitPriceScale({ ...vp, priceScaleMode: 'auto' } as VisibleRange);
          return { priceMin: auto.priceMin, priceMax: auto.priceMax };
        },
        baseline,
      );
    };

    return registerPane({
      paneId,
      syncTimeWindow,
      navigateToViewport,
      applyWheelAction,
      getViewport: () => vpRef.current,
      resetViewport,
      resetPriceScale,
      isViewportModified,
      getLastDrawPhases: () => schedulerRef.current?.getLastPhases() ?? null,
    });
  }, [
    registerPane,
    paneId,
    candles,
    fitPriceScaleIfAuto,
    width,
    height,
    indicators,
    rangePreset,
    interval,
    showTimeAxis,
    drawRef,
    chartSettings,
    isPricePane,
    emitViewport,
    eventMarkers.length,
    fitPriceScale,
    isDraggingRef,
    onUserTimePanRef,
    schedulerRef,
    vpRef,
  ]);

  return {
    layoutViewport,
    fitPriceScaleIfAuto,
    fitPriceScale,
    buildSessionViewport,
    emitViewport,
    priceScaleSide,
  };
}
