'use client';

import { useEffect, useLayoutEffect, useRef, useCallback, type RefObject } from 'react';
import type { Candle, VisibleRange, Theme, SerializedDrawing, IndicatorConfig, Interval, CrosshairMoveEvent, Range, ChartEventMarker, ChartReferenceLine, ChartAnnotationChannelMarker } from '@edge/chart-core';
import type { ChartSettings } from './chartSettings';
import { mergeChartSettings, resolvePriceScaleSide } from './chartSettings';
import type { ViewportState } from './viewport';
import type { RegisterPane } from './paneHandle';
import type { WheelAction } from '@edge/chart-core/wheel';
import {
  createViewport,
  pan as panVp,
  zoom as zoomVp,
  applyMomentum,
  scalePriceFromInitial,
  scaleTimeFromInitial,
  panPrice,
  attachViewportHelpers,
  refreshViewportForDataChange,
  getDefaultViewport,
  isViewportModified as isViewportModifiedFn,
  withPriceScaleContext,
  ensureRightMarginBars,
  applyPriceScaleLayout,
} from './viewport';
import { applyPanePriceScale, resetPanePriceScale } from './indicatorScale';
import {
  resolveDragMode,
  resolveHoverCursor,
  isPriceAxisHit,
  plotHeight,
  plotWidth,
  plotLeftOffset,
  type ChartCursor,
  type DragMode,
  type PriceScaleSide,
} from '@edge/chart-core/layout';
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
import { formatAxisTime } from '@edge/chart-core/time';
import { formatCrosshairValue, shouldClearCrosshairOnLeave } from '@edge/chart-core/crosshair';
import { hitTestAll } from '@edge/chart-core';
import { clampPlot, pointToPlot } from '@edge/chart-core/drawingCoords';
import type { DrawingPointerEvent } from '@edge/chart-core/drawingController';
import { getSessionViewport } from './rangePresets';
import { hitTestEventBadge, type EventBadgeGroup } from './eventBadges';
import { snapshotViewport, type ActiveGesture } from './paneGesture';
import { drawPaneLayers } from './paneRenderer';

type Props = {
  candles: Candle[];
  chartType: string;
  theme: Theme;
  visibleCount?: number | null;
  width: number;
  height: number;
  drawings?: SerializedDrawing[];
  previewDrawing?: SerializedDrawing | null;
  selectedDrawingId?: string | null;
  drawingMode?: 'navigate' | 'create' | 'edit';
  indicators?: IndicatorConfig[];
  paneId?: string;
  interval?: Interval;
  showTimeAxis?: boolean;
  registerPane?: RegisterPane;
  wheelingRef?: RefObject<boolean>;
  onCrosshairMove?: (event: CrosshairMoveEvent | null) => void;
  onViewportChange?: (vp: VisibleRange, paneId: string) => void;
  onDrawingPointer?: (event: DrawingPointerEvent) => boolean | void;
  onDrawingContextMenu?: (event: DrawingPointerEvent & { clientX: number; clientY: number }) => boolean | void;
  onPriceScaleContextMenu?: (pos: { clientX: number; clientY: number; priceScaleMode: 'auto' | 'manual' }) => void;
  suppressCrosshair?: boolean;
  /** `'__cursor__'` for navigate mode; drawing tool name when placing overlays. */
  activeTool?: string;
  /** Visible window preset; used on price pane to align left/right chart edges. */
  range?: Range;
  /** Active bottom-bar preset; null = default landing view (last N bars). */
  rangePreset?: Range | null;
  /** Bumps when loaded series identity changes — triggers viewport reset. */
  viewportRevision?: string;
  chartSettings?: ChartSettings;
  /** When false, skip main candle rendering on the price pane. */
  mainSeriesVisible?: boolean;
  /** User panned/zoomed the time axis (enables edge history prefetch in parent). */
  onUserTimePan?: () => void;
  eventMarkers?: ChartEventMarker[];
  referenceLines?: ChartReferenceLine[];
  annotationMarkers?: ChartAnnotationChannelMarker[];
  livePrice?: number | null;
  liveMarketSession?: import('@edge/chart-core').MarketSessionKind | null;
  selectedEventBadgeId?: string | null;
  onEventBadgeClick?: (
    group: EventBadgeGroup,
    pos: { clientX: number; clientY: number; plotX: number; plotY: number },
  ) => void;
  onEventBadgeHover?: (group: EventBadgeGroup | null) => void;
};

export default function ChartCanvas({
  candles,
  chartType,
  theme,
  width,
  height,
  drawings = [],
  previewDrawing = null,
  selectedDrawingId = null,
  drawingMode = 'navigate',
  indicators = [],
  paneId = 'price',
  interval,
  showTimeAxis = true,
  registerPane,
  wheelingRef,
  onCrosshairMove,
  onViewportChange,
  onDrawingPointer,
  onDrawingContextMenu,
  onPriceScaleContextMenu,
  suppressCrosshair = false,
  activeTool = '__cursor__',
  range,
  rangePreset = null,
  viewportRevision,
  chartSettings: chartSettingsProp,
  mainSeriesVisible = true,
  onUserTimePan,
  eventMarkers = [],
  referenceLines = [],
  annotationMarkers = [],
  livePrice = null,
  liveMarketSession = null,
  selectedEventBadgeId = null,
  onEventBadgeClick,
  onEventBadgeHover,
}: Props) {
  const chartSettings = mergeChartSettings(chartSettingsProp);
  const chartSettingsRef = useRef(chartSettings);
  chartSettingsRef.current = chartSettings;
  const priceScaleSide = resolvePriceScaleSide(chartSettings.scales.priceScalePlacement);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vpRef = useRef<ReturnType<typeof createViewport> | null>(null);
  const rafRef = useRef<number | null>(null);
  const momentumRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const dragModeRef = useRef<DragMode>('body');
  const isDraggingRef = useRef(false);
  const appliedCursorRef = useRef<ChartCursor>('default');
  const activeToolRef = useRef(activeTool);
  const lastLocalRef = useRef({ x: 0, y: 0 });
  const activeGestureRef = useRef<ActiveGesture>(null);
  activeToolRef.current = activeTool;
  const drawRef = useRef<(reason?: DrawInvalidationReason) => void>(() => {});
  const schedulerRef = useRef<RenderScheduler | null>(null);
  const backgroundCacheRef = useRef(new BackgroundLayerCache());
  const candleWebGLRef = useRef<CandleWebGLRenderer | null>(null);
  const candlesUseWebGLRef = useRef(false);
  const indicatorWebGLRef = useRef<IndicatorWebGLRenderer | null>(null);
  const indicatorsUseWebGLRef = useRef(false);
  const webglValidationLoggedRef = useRef(false);
  const prevDimsRef = useRef({ width: 0, height: 0 });
  const prevCandleCountRef = useRef(0);
  const prevViewportRevisionRef = useRef<string | undefined>(undefined);
  const onUserTimePanRef = useRef(onUserTimePan);
  onUserTimePanRef.current = onUserTimePan;
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;
  const onDrawingPointerRef = useRef(onDrawingPointer);
  onDrawingPointerRef.current = onDrawingPointer;
  const drawingModeRef = useRef(drawingMode);
  drawingModeRef.current = drawingMode;
  const suppressCrosshairRef = useRef(suppressCrosshair);
  suppressCrosshairRef.current = suppressCrosshair;
  const drawingDragRef = useRef(false);
  const hoveredDrawingIdRef = useRef<string | null>(null);
  const eventBadgeGroupsRef = useRef<EventBadgeGroup[]>([]);
  const hoveredEventBadgeIdRef = useRef<string | null>(null);
  const onEventBadgeClickRef = useRef(onEventBadgeClick);
  onEventBadgeClickRef.current = onEventBadgeClick;
  const onEventBadgeHoverRef = useRef(onEventBadgeHover);
  onEventBadgeHoverRef.current = onEventBadgeHover;
  const selectedEventBadgeIdRef = useRef(selectedEventBadgeId);
  selectedEventBadgeIdRef.current = selectedEventBadgeId;

  const toPlotEvent = (e: React.MouseEvent, phase: DrawingPointerEvent['phase']): DrawingPointerEvent => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const plot = clampPlot(x, y, width, height, showTimeAxis);
    return { phase, plotX: plot.x, plotY: plot.y, button: e.button, detail: e.detail, paneId };
  };

  const layoutViewport = useCallback(
    (vp: VisibleRange) =>
      applyPriceScaleLayout(vp, {
        invert: paneId === 'price' && chartSettings.scales.invertPriceScale,
        side: paneId === 'price' ? priceScaleSide : 'right',
      }),
    [chartSettings.scales.invertPriceScale, paneId, priceScaleSide],
  );

  const isPlotBody = (x: number, y: number) =>
    resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide) === 'body';

  const plotCoordsFromClient = (x: number, y: number) => {
    const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
    return { plotX: x - plotOffset, plotY: y };
  };

  const hitTestEventBadgeAt = (x: number, y: number): EventBadgeGroup | null => {
    if (!isPricePane || eventBadgeGroupsRef.current.length === 0) return null;
    const { plotX, plotY } = plotCoordsFromClient(x, y);
    return hitTestEventBadge(plotX, plotY, eventBadgeGroupsRef.current);
  };

  const emitViewport = (vp: VisibleRange) => {
    onViewportChange?.(vp, paneId);
  };

  const applyCursor = useCallback((x: number, y: number, isDragging = isDraggingRef.current) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cursor = resolveHoverCursor(x, y, width, height, {
      showTimeAxis,
      activeTool: activeToolRef.current,
      isDragging,
      dragMode: isDragging ? dragModeRef.current : null,
      priceScaleSide,
    });
    if (appliedCursorRef.current === cursor) return;
    appliedCursorRef.current = cursor;
    canvas.style.cursor = cursor;
  }, [width, height, showTimeAxis, priceScaleSide]);

  const resetCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    appliedCursorRef.current = 'default';
    canvas.style.cursor = 'default';
  }, []);

  const isPricePane = paneId === 'price';

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
      ? getSessionViewport(candles, width, height, rangePreset ?? null)
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
  }, [candles, width, height, rangePreset, isPricePane, showTimeAxis, eventMarkers.length, fitPriceScaleIfAuto]);

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
        selectedEventBadgeId: selectedEventBadgeIdRef.current,
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

  // Canvas width/height attribute changes clear pixels immediately, so resize redraws must
  // run before paint or users see a blank chart while panels are dragged.
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
      drawRef.current('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (!vpRef.current) {
      const vp = buildSessionViewport();
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (dimsChanged) {
      let vp = refreshViewportForDataChange(vpRef.current, candles, width, height);
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current('data');
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    // History prepend — parent shifts indices; only rebind helpers and refit Y.
    if (
      !revisionChanged &&
      candles.length > prevCandleCountRef.current &&
      prevCandleCountRef.current > 0
    ) {
      let vp = attachViewportHelpers({ ...vpRef.current }, candles.length);
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      drawRef.current('data');
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
  ]);

  // Re-bind Y helpers when time-axis or event-rail reservation changes without a size change.
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
    drawNow('settings');
  }, [showTimeAxis, eventMarkers.length, candles.length, isPricePane, drawNow]);

  // Imperative pane registration for time sync + centralized wheel (no React state per tick).
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
      drawNow('viewport');
    };

    const navigateToViewport = (startIndex: number, endIndex: number): VisibleRange | null => {
      if (!vpRef.current || candles.length === 0) return null;
      let next = { ...vpRef.current, startIndex, endIndex } as VisibleRange;
      next = attachViewportHelpers(next, candles.length);
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      drawNow('viewport');
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
      drawNow('viewport');
      emitViewport(vp);
      return vp;
    };

    const resetViewport = (): VisibleRange | null => {
      if (candles.length === 0 || !vpRef.current) return null;
      let next: VisibleRange;
      if (paneId === 'price') {
        next = attachViewportHelpers(
          {
            ...getSessionViewport(candles, width, height, rangePreset ?? null),
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
      drawNow('viewport');
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
      drawNow('settings');
      return next;
    };

    const isViewportModified = (): boolean => {
      if (!vpRef.current || candles.length === 0) return false;
      return isViewportModifiedFn(vpRef.current, candles, width, height, (vp) => {
        const auto = fitPriceScale({ ...vp, priceScaleMode: 'auto' } as VisibleRange);
        return { priceMin: auto.priceMin, priceMax: auto.priceMax };
      });
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
  }, [registerPane, paneId, candles, fitPriceScaleIfAuto, width, height, indicators, rangePreset, showTimeAxis, drawNow, chartSettings, isPricePane]);

  useEffect(() => {
    drawNow('data');
  }, [drawWithReasons, drawNow]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragModeRef.current = resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide);
    activeGestureRef.current = null;

    if (
      isPricePane &&
      drawingModeRef.current === 'navigate' &&
      onEventBadgeClickRef.current
    ) {
      const badge = hitTestEventBadgeAt(x, y);
      if (badge) {
        const { plotX, plotY } = plotCoordsFromClient(x, y);
        onEventBadgeClickRef.current(badge, {
          clientX: e.clientX,
          clientY: e.clientY,
          plotX,
          plotY,
        });
        applyCursor(x, y, false);
        return;
      }
    }

    const useDrawing =
      onDrawingPointerRef.current &&
      isPlotBody(x, y) &&
      drawingModeRef.current !== 'navigate';

    if (useDrawing) {
      drawingDragRef.current = true;
      isDraggingRef.current = true;
      onDrawingPointerRef.current!(toPlotEvent(e, 'down'));
      applyCursor(x, y, true);
      return;
    }

    if (
      onDrawingPointerRef.current &&
      isPlotBody(x, y) &&
      drawingModeRef.current === 'navigate'
    ) {
      const consumed = onDrawingPointerRef.current(toPlotEvent(e, 'down'));
      if (consumed) {
        drawingDragRef.current = true;
        isDraggingRef.current = true;
        applyCursor(x, y, true);
        return;
      }
    }

    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    momentumRef.current = 0;
    if (vpRef.current) {
      if (dragModeRef.current === 'price') {
        activeGestureRef.current = {
          type: 'priceScale',
          initial: snapshotViewport(vpRef.current),
          startY: e.clientY,
        };
      } else if (dragModeRef.current === 'timeAxis') {
        activeGestureRef.current = {
          type: 'timeScale',
          initial: snapshotViewport(vpRef.current),
          startX: e.clientX,
        };
      } else {
        activeGestureRef.current = { type: 'bodyPan' };
      }
    }
    applyCursor(x, y, true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!vpRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastLocalRef.current = { x, y };

    if (isDraggingRef.current) {
      applyCursor(x, y, true);

      if (drawingDragRef.current && onDrawingPointerRef.current) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => requestDraw('drawings'));
        return;
      }

      if (
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current === 'edit' &&
        dragModeRef.current === 'body'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => requestDraw('drawings'));
        return;
      }

      if (
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current === 'navigate' &&
        dragModeRef.current === 'body'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
      }

      const hoverZone = resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide);
      const gesture = activeGestureRef.current;
      if (
        (gesture?.type === 'priceScale' || gesture?.type === 'timeScale') &&
        hoverZone === 'body'
      ) {
        dragModeRef.current = 'body';
        activeGestureRef.current = { type: 'bodyPan' };
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      }

      const activeGesture = activeGestureRef.current;
      if (activeGesture?.type === 'priceScale') {
        const totalDeltaY = e.clientY - activeGesture.startY;
        vpRef.current = scalePriceFromInitial(
          activeGesture.initial,
          totalDeltaY,
          candles.length,
          showTimeAxis
        );
        emitViewport(vpRef.current);
      } else if (activeGesture?.type === 'timeScale') {
        const totalDeltaX = e.clientX - activeGesture.startX;
        if (totalDeltaX !== 0) onUserTimePanRef.current?.();
        vpRef.current = scaleTimeFromInitial(
          activeGesture.initial,
          totalDeltaX,
          candles.length
        );
        emitViewport(vpRef.current);
      } else if (activeGesture?.type === 'bodyPan' && drawingModeRef.current === 'navigate') {
        const deltaX = e.clientX - lastXRef.current;
        const deltaY = e.clientY - lastYRef.current;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
        momentumRef.current = deltaX * 0.8;

        let vp = vpRef.current;
        if (deltaX !== 0) {
          onUserTimePanRef.current?.();
          vp = panVp(vp, deltaX, candles.length);
        }
        if ((vp.priceScaleMode ?? 'auto') === 'manual' && deltaY !== 0) {
          vp = panPrice(vp, deltaY, candles.length);
        }
        vp = fitPriceScaleIfAuto(vp);
        vpRef.current = vp;
        emitViewport(vp);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => requestDraw('viewport'));
    } else {
      applyCursor(x, y, false);

      if (isPricePane && eventBadgeGroupsRef.current.length > 0) {
        const badge = hitTestEventBadgeAt(x, y);
        const nextBadgeId = badge?.id ?? null;
        if (hoveredEventBadgeIdRef.current !== nextBadgeId) {
          hoveredEventBadgeIdRef.current = nextBadgeId;
          onEventBadgeHoverRef.current?.(badge);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => requestDraw('crosshair'));
        }
        if (badge) {
          const canvas = canvasRef.current;
          if (canvas && appliedCursorRef.current !== 'pointer') {
            appliedCursorRef.current = 'pointer';
            canvas.style.cursor = 'pointer';
          }
          return;
        }
      }

      const nextHoveredDrawingId =
        drawingModeRef.current === 'navigate' && isPlotBody(x, y)
          ? hitTestAll(x, y, drawings, layoutViewport(vpRef.current), candles, showTimeAxis)
          : null;
      if (hoveredDrawingIdRef.current !== nextHoveredDrawingId) {
        hoveredDrawingIdRef.current = nextHoveredDrawingId;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => requestDraw('drawings'));
      }

      if (
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current !== 'navigate'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => requestDraw('drawings'));
        return;
      }

      if (suppressCrosshairRef.current) return;

      const vp = layoutViewport(vpRef.current);
      const pw = plotWidth(width, priceScaleSide);
      const ph = plotHeight(
        height,
        showTimeAxis,
        isPricePane && eventMarkers.length > 0 && showTimeAxis,
      );
      const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
      const pointerCrosshairX = Math.max(0, Math.min(pw, x - plotOffset));
      const lockedPlotX = chartSettingsRef.current.canvas.lockCrosshairToTime
        ? chartSettingsRef.current.canvas.lockedCrosshairPlotX
        : null;
      const crosshairX =
        typeof lockedPlotX === 'number' && Number.isFinite(lockedPlotX)
          ? Math.max(0, Math.min(pw, lockedPlotX))
          : pointerCrosshairX;
      const plotY = Math.max(0, Math.min(ph, y));

      let idx = vp.indexForX(crosshairX);

      const candle = idx >= 0 && idx < candles.length ? candles[idx] : null;
      const timeLabel = candle ? formatAxisTime(candle.t, interval) : '';
      const valueLabel = formatCrosshairValue(
        paneId,
        plotY,
        vp,
        candles,
        idx,
        indicators,
        showTimeAxis
      );

      onCrosshairMoveRef.current?.({
        paneId,
        plotX: crosshairX,
        plotY,
        localY: y,
        timestamp: candle?.t ?? null,
        dataIndex: idx,
        valueLabel,
        timeLabel,
      });
    }
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (drawingDragRef.current && onDrawingPointerRef.current && e) {
      onDrawingPointerRef.current(toPlotEvent(e, 'up'));
    } else if (onDrawingPointerRef.current && e) {
      const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isPlotBody(x, y)) {
        onDrawingPointerRef.current(toPlotEvent(e, 'up'));
      }
    }
    drawingDragRef.current = false;
    isDraggingRef.current = false;
    activeGestureRef.current = null;
    applyCursor(lastLocalRef.current.x, lastLocalRef.current.y, false);
    if (dragModeRef.current === 'body' && Math.abs(momentumRef.current) > 1) {
      onUserTimePanRef.current?.();
      const loop = () => {
        if (!vpRef.current) return;
        const res = applyMomentum(vpRef.current, momentumRef.current, candles.length);
        let vp = fitPriceScaleIfAuto(res.vp);
        vpRef.current = vp;
        momentumRef.current = res.velocity;
        emitViewport(vp);
        drawNow('viewport');
        if (Math.abs(momentumRef.current) > 0.5) {
          rafRef.current = requestAnimationFrame(loop);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!vpRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (isPriceAxisHit(x, width, priceScaleSide)) {
      vpRef.current = resetPanePriceScale(vpRef.current, candles, paneId, indicators, chartSettings);
      if (isPricePane && vpRef.current) {
        vpRef.current = attachViewportHelpers(
          ensureRightMarginBars(vpRef.current, candles.length, width, chartSettings.canvas.marginRightBars),
          candles.length,
        );
        vpRef.current = fitPriceScaleIfAuto(vpRef.current);
      }
      emitViewport(vpRef.current);
      drawNow('settings');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPricePane && isPriceAxisHit(x, width, priceScaleSide) && onPriceScaleContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onPriceScaleContextMenu({
        clientX: e.clientX,
        clientY: e.clientY,
        priceScaleMode: vpRef.current?.priceScaleMode ?? 'auto',
      });
      return;
    }

    if (!onDrawingContextMenu || !isPricePane) return;
    e.preventDefault();
    const plot = clampPlot(x, y, width, height, showTimeAxis);
    const consumed = onDrawingContextMenu({
      phase: 'down',
      plotX: plot.x,
      plotY: plot.y,
      button: 2,
      clientX: e.clientX,
      clientY: e.clientY,
    });
    if (consumed) e.stopPropagation();
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e)}
      onMouseLeave={(e) => {
        handleMouseUp(e);
        if (hoveredDrawingIdRef.current) {
          hoveredDrawingIdRef.current = null;
          requestDraw('selection');
        }
        if (hoveredEventBadgeIdRef.current) {
          hoveredEventBadgeIdRef.current = null;
          onEventBadgeHoverRef.current?.(null);
          requestDraw('crosshair');
        }
        resetCursor();
        if (wheelingRef?.current) return;
        const container = (e.currentTarget as HTMLElement).closest('[data-edge-chart]');
        if (shouldClearCrosshairOnLeave(e.relatedTarget, container)) {
          onCrosshairMoveRef.current?.(null);
        }
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    />
  );
}
