import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type {
  Candle,
  VisibleRange,
  Theme,
  SerializedDrawing,
  IndicatorConfig,
  Interval,
  ChartEventMarker,
  ChartReferenceLine,
  ChartAnnotationChannelMarker,
} from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import { BackgroundLayerCache } from './layerCache';
import {
  defaultLayerRegistry,
  registerWebGLCandlesLayer,
  registerWebGLIndicatorsLayer,
} from './layers';
import { CandleWebGLRenderer, isWebGLCandlesPreferred } from './webgl/candleWebGL';
import { IndicatorWebGLRenderer, isWebGLIndicatorsPreferred } from './webgl/indicatorWebGL';
import {
  buildWebGLCandleValidationReport,
  logWebGLCandleValidation,
} from './webgl/webglBrowserValidation';
import {
  RenderScheduler,
  type DrawInvalidationReason,
} from './renderScheduler';
import { drawPaneLayers } from './paneRenderer';
import type { EventBadgeGroup } from './eventBadges';

type CanvasRendererParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  vpRef: RefObject<VisibleRange | null>;
  candles: Candle[];
  chartType: string;
  theme: Theme;
  width: number;
  height: number;
  drawings: SerializedDrawing[];
  previewDrawing: SerializedDrawing | null;
  selectedDrawingId: string | null;
  indicators: IndicatorConfig[];
  paneId: string;
  interval?: Interval;
  isPricePane: boolean;
  showTimeAxis: boolean;
  chartSettings: RequiredChartSettings;
  layoutViewport: (vp: VisibleRange) => VisibleRange;
  priceScaleSide: PriceScaleSide;
  mainSeriesVisible: boolean;
  eventMarkers: ChartEventMarker[];
  referenceLines: ChartReferenceLine[];
  annotationMarkers: ChartAnnotationChannelMarker[];
  livePrice: number | null;
  liveMarketSession: import('@edge/chart-core').MarketSessionKind | null;
  selectedEventBadgeId: string | null;
  hoveredDrawingIdRef: RefObject<string | null>;
  hoveredEventBadgeIdRef: RefObject<string | null>;
  eventBadgeGroupsRef: RefObject<EventBadgeGroup[]>;
  drawRef: RefObject<(reason?: DrawInvalidationReason) => void>;
  schedulerRef: RefObject<RenderScheduler | null>;
};

export function useCanvasRenderer({
  canvasRef,
  vpRef,
  candles,
  chartType,
  theme,
  width,
  height,
  drawings,
  previewDrawing,
  selectedDrawingId,
  indicators,
  paneId,
  interval,
  isPricePane,
  showTimeAxis,
  chartSettings,
  layoutViewport,
  priceScaleSide,
  mainSeriesVisible,
  eventMarkers,
  referenceLines,
  annotationMarkers,
  livePrice,
  liveMarketSession,
  selectedEventBadgeId,
  hoveredDrawingIdRef,
  hoveredEventBadgeIdRef,
  eventBadgeGroupsRef,
  drawRef,
  schedulerRef,
}: CanvasRendererParams) {
  const backgroundCacheRef = useRef(new BackgroundLayerCache());
  const candleWebGLRef = useRef<CandleWebGLRenderer | null>(null);
  const candlesUseWebGLRef = useRef(false);
  const indicatorWebGLRef = useRef<IndicatorWebGLRenderer | null>(null);
  const indicatorsUseWebGLRef = useRef(false);
  const webglValidationLoggedRef = useRef(false);

  useLayoutEffect(() => {
    if (!isPricePane || !isWebGLCandlesPreferred()) {
      candlesUseWebGLRef.current = false;
      return;
    }
    const renderer = new CandleWebGLRenderer();
    if (renderer.tryCreate()) {
      candleWebGLRef.current = renderer;
      candlesUseWebGLRef.current = true;
      registerWebGLCandlesLayer(defaultLayerRegistry);
    }
    return () => {
      renderer.dispose();
      candleWebGLRef.current = null;
      candlesUseWebGLRef.current = false;
      webglValidationLoggedRef.current = false;
    };
  }, [isPricePane]);

  useLayoutEffect(() => {
    if (!isWebGLIndicatorsPreferred()) {
      indicatorsUseWebGLRef.current = false;
      return;
    }
    const renderer = new IndicatorWebGLRenderer();
    if (renderer.tryCreate()) {
      indicatorWebGLRef.current = renderer;
      indicatorsUseWebGLRef.current = true;
      registerWebGLIndicatorsLayer(defaultLayerRegistry);
    }
    return () => {
      renderer.dispose();
      indicatorWebGLRef.current = null;
      indicatorsUseWebGLRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isPricePane || webglValidationLoggedRef.current || !isWebGLCandlesPreferred()) return;
    webglValidationLoggedRef.current = true;
    logWebGLCandleValidation(
      buildWebGLCandleValidationReport({
        chartType,
        renderer: candleWebGLRef.current,
        candlesUseWebGL: candlesUseWebGLRef.current,
      }),
    );
  }, [isPricePane, chartType]);

  const drawWithReasons = useCallback(
    (reasons: ReadonlySet<DrawInvalidationReason>) => {
      const canvas = canvasRef.current;
      if (!canvas || !vpRef.current) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const vp = layoutViewport(vpRef.current);
      const effectiveShowTimeAxis = showTimeAxis && chartSettings.scales.showTimeScale;
      const phases = drawPaneLayers({
        ctx,
        vp,
        width,
        height,
        theme,
        candles,
        indicators,
        drawings,
        previewDrawing,
        selectedDrawingId,
        hoveredDrawingId: hoveredDrawingIdRef.current,
        chartType,
        chartSettings,
        interval,
        paneId,
        isPricePane,
        showTimeAxis,
        effectiveShowTimeAxis,
        priceScaleSide,
        mainSeriesVisible,
        eventMarkers,
        referenceLines,
        annotationMarkers,
        livePrice,
        liveMarketSession,
        hoveredEventBadgeId: hoveredEventBadgeIdRef.current,
        selectedEventBadgeId,
        onEventBadgeGroupsDrawn: (groups) => {
          eventBadgeGroupsRef.current = groups;
        },
        reasons,
        backgroundCache: backgroundCacheRef.current,
        candleWebGL: candleWebGLRef.current,
        candlesUseWebGL: candlesUseWebGLRef.current,
        indicatorWebGL: indicatorWebGLRef.current,
        indicatorsUseWebGL: indicatorsUseWebGLRef.current,
      });
      schedulerRef.current?.recordPhases(phases);
    },
    [
      canvasRef,
      vpRef,
      candles,
      chartType,
      theme,
      width,
      height,
      drawings,
      previewDrawing,
      selectedDrawingId,
      indicators,
      paneId,
      interval,
      isPricePane,
      showTimeAxis,
      chartSettings,
      layoutViewport,
      priceScaleSide,
      mainSeriesVisible,
      eventMarkers,
      referenceLines,
      annotationMarkers,
      livePrice,
      liveMarketSession,
      selectedEventBadgeId,
      hoveredDrawingIdRef,
      hoveredEventBadgeIdRef,
      eventBadgeGroupsRef,
    ],
  );

  const drawImplRef = useRef(drawWithReasons);
  drawImplRef.current = drawWithReasons;

  if (!schedulerRef.current) {
    schedulerRef.current = new RenderScheduler((reasons) => drawImplRef.current(reasons));
  }

  const requestDraw = useCallback((reason: DrawInvalidationReason) => {
    schedulerRef.current?.request(reason);
  }, []);

  const drawNow = useCallback((reason: DrawInvalidationReason) => {
    schedulerRef.current?.drawNow(reason);
  }, []);

  drawRef.current = (reason: DrawInvalidationReason = 'data') => {
    drawNow(reason);
  };

  useEffect(() => {
    drawNow('data');
  }, [drawWithReasons, drawNow]);

  return {
    requestDraw,
    drawNow,
  };
}
