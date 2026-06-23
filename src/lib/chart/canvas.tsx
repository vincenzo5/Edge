'use client';

import { useEffect, useLayoutEffect, useRef, useCallback, type RefObject } from 'react';
import type { Candle, VisibleRange, Theme, SerializedDrawing, IndicatorConfig, Interval, CrosshairMoveEvent, Range } from './contracts';
import type { ChartSettings } from './chartSettings';
import { mergeChartSettings, resolvePriceScaleSide } from './chartSettings';
import type { ViewportState } from './viewport';
import type { RegisterPane } from './paneHandle';
import type { WheelAction } from './wheel';
import {
  createViewport,
  pan as panVp,
  zoom as zoomVp,
  applyMomentum,
  scalePriceFromInitial,
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
} from './layout';
import { drawGrid, drawCandles, drawPlotBackground, drawPriceAxisAnnotations, drawAxes } from './renderer';
import { formatAxisTime } from './time';
import { formatCrosshairValue, shouldClearCrosshairOnLeave } from './crosshair';
import { DrawingRegistry, IndicatorRegistry, hitTestAll } from './pluginHost';
import { drawIndicator } from './indicators/draw';
import { clampPlot, pointToPlot } from './drawingCoords';
import { drawAnnotationBadge } from './drawings/annotationBadge';
import type { DrawingPointerEvent } from './drawingController';
import { drawControlPoints, sortDrawingsByZ } from './drawings/primitives';
import { getSessionViewport } from './rangePresets';

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
  /** User panned/zoomed the time axis (enables edge history prefetch in parent). */
  onUserTimePan?: () => void;
};

function snapshotViewport(vp: VisibleRange): ViewportState {
  return {
    startIndex: vp.startIndex,
    endIndex: vp.endIndex,
    priceMin: vp.priceMin,
    priceMax: vp.priceMax,
    width: vp.width,
    height: vp.height,
    priceScaleMode: vp.priceScaleMode,
    reserveTimeAxis: vp.reserveTimeAxis,
    priceScaleContext: vp.priceScaleContext,
  };
}

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
  onUserTimePan,
}: Props) {
  const chartSettings = mergeChartSettings(chartSettingsProp);
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
  const axisDragSnapshotRef = useRef<ViewportState | null>(null);
  const axisDragStartRef = useRef({ clientX: 0, clientY: 0 });
  activeToolRef.current = activeTool;
  const drawRef = useRef<() => void>(() => {});
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

  const fitPriceScale = useCallback(
    (vp: VisibleRange) =>
      applyPanePriceScale(vp, candles, paneId, indicators, chartSettings),
    [candles, paneId, indicators, chartSettings],
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
    vp = attachViewportHelpers({ ...vp, reserveTimeAxis: showTimeAxis }, candles.length);
    return fitPriceScaleIfAuto(vp);
  }, [candles, width, height, rangePreset, isPricePane, showTimeAxis, fitPriceScaleIfAuto]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vpRef.current) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const vp = layoutViewport(vpRef.current);

    const effectiveShowTimeAxis = showTimeAxis && chartSettings.scales.showTimeScale;

    drawPlotBackground(ctx, width, height, theme, chartSettings, effectiveShowTimeAxis);

    if (chartSettings.canvas.showGrid) {
      drawGrid(ctx, vp, width, height, theme, chartSettings, candles, interval);
    }
    if (isPricePane) {
      drawCandles(ctx, candles, vp, theme, chartType as any, chartSettings);
    }

    for (const ind of indicators) {
      const plugin = IndicatorRegistry.get(ind.name);
      if (plugin && ind.visible !== false) {
        drawIndicator(plugin, ind, ctx, candles, vp, theme);
      }
    }

    for (const d of sortDrawingsByZ(drawings)) {
      if (!d.visible) continue;
      const plugin = DrawingRegistry.get(d.name);
      if (plugin) {
        const selected = d.id === selectedDrawingId;
        plugin.draw(ctx, d, vp, theme, selected, candles, { showTimeAxis });
        if (d.metadata?.kind && d.points.length > 0) {
          const anchor = pointToPlot(d.points[0]!, vp, candles, showTimeAxis);
          drawAnnotationBadge(ctx, d, anchor, theme);
        }
      }
    }

    const hoveredDrawing = drawings.find(
      (d) => d.id && d.id === hoveredDrawingIdRef.current && d.id !== selectedDrawingId
    );
    if (hoveredDrawing?.visible) {
      const plugin = DrawingRegistry.get(hoveredDrawing.name);
      const points = plugin?.getControlPoints?.(hoveredDrawing, vp, candles, showTimeAxis);
      if (points?.length) {
        drawControlPoints(ctx, points, theme, true);
      }
    }

    if (previewDrawing && previewDrawing.visible !== false) {
      const plugin = DrawingRegistry.get(previewDrawing.name);
      if (plugin) {
        plugin.draw(ctx, previewDrawing, vp, theme, false, candles, {
          preview: true,
          showTimeAxis,
        });
        const points = plugin.getControlPoints?.(previewDrawing, vp, candles, showTimeAxis);
        if (points?.length) {
          drawControlPoints(ctx, points, theme, true);
        }
      }
    }

    const axisSide: PriceScaleSide = isPricePane ? priceScaleSide : 'right';
    drawAxes(
      ctx,
      vp,
      width,
      height,
      theme,
      chartSettings,
      candles,
      interval,
      effectiveShowTimeAxis,
      chartSettings.scales.showPriceScale,
      axisSide,
    );

    if (chartSettings.scales.showPriceScale) {
      drawPriceAxisAnnotations({
        ctx,
        vp,
        width,
        height,
        theme,
        settings: chartSettings,
        paneId,
        candles,
        indicators,
        drawings,
        interval,
        showTimeAxis: effectiveShowTimeAxis,
      });
    }
  }, [candles, chartType, theme, width, height, drawings, previewDrawing, selectedDrawingId, indicators, paneId, interval, isPricePane, showTimeAxis, chartSettings, layoutViewport, priceScaleSide]);

  // Init viewport when loaded series or size changes.
  useEffect(() => {
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
      drawRef.current();
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (!vpRef.current) {
      const vp = buildSessionViewport();
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current();
      prevDimsRef.current = { width, height };
      prevCandleCountRef.current = candles.length;
      return;
    }

    if (dimsChanged) {
      let vp = refreshViewportForDataChange(vpRef.current, candles, width, height);
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current();
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
      drawRef.current();
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

  // Re-bind Y helpers when time-axis reservation changes without a size change.
  useEffect(() => {
    if (!vpRef.current || candles.length === 0) return;
    const reserve = showTimeAxis;
    if ((vpRef.current.reserveTimeAxis ?? true) === reserve) return;
    vpRef.current = attachViewportHelpers(
      { ...vpRef.current, reserveTimeAxis: reserve },
      candles.length
    );
    drawRef.current();
  }, [showTimeAxis, candles.length]);

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
      drawRef.current();
    };

    const navigateToViewport = (startIndex: number, endIndex: number): VisibleRange | null => {
      if (!vpRef.current || candles.length === 0) return null;
      let next = { ...vpRef.current, startIndex, endIndex } as VisibleRange;
      next = attachViewportHelpers(next, candles.length);
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      drawRef.current();
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
      drawRef.current();
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
          },
          candles.length,
        );
      } else {
        next = resetPanePriceScale(vpRef.current, candles, paneId, indicators, chartSettings);
      }
      next = fitPriceScaleIfAuto(next);
      vpRef.current = next;
      emitViewport(next);
      drawRef.current();
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
      drawRef.current();
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
    });
  }, [registerPane, paneId, candles, fitPriceScaleIfAuto, width, height, indicators, rangePreset, showTimeAxis]);

  useEffect(() => {
    drawRef.current = draw;
    drawRef.current();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragModeRef.current = resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide);
    // Time-axis strip scrolls (pans) like the plot; only the price axis scales Y.
    if (dragModeRef.current === 'timeAxis') {
      dragModeRef.current = 'body';
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
    if (vpRef.current && dragModeRef.current === 'price') {
      const manualPrice =
        (vpRef.current.priceScaleMode ?? 'auto') === 'manual';
      if (manualPrice) {
        axisDragSnapshotRef.current = null;
      } else {
        axisDragSnapshotRef.current = snapshotViewport(vpRef.current);
        axisDragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
      }
    } else {
      axisDragSnapshotRef.current = null;
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
        rafRef.current = requestAnimationFrame(() => drawRef.current());
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
        rafRef.current = requestAnimationFrame(() => drawRef.current());
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
      if (dragModeRef.current === 'price' && hoverZone === 'body') {
        dragModeRef.current = 'body';
        axisDragSnapshotRef.current = null;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      }

      if (dragModeRef.current === 'price') {
        const snapshot = axisDragSnapshotRef.current;
        if (snapshot) {
          const totalDeltaY = e.clientY - axisDragStartRef.current.clientY;
          vpRef.current = scalePriceFromInitial(
            snapshot,
            totalDeltaY,
            candles.length,
            showTimeAxis
          );
          emitViewport(vpRef.current);
        } else if ((vpRef.current.priceScaleMode ?? 'auto') === 'manual') {
          const deltaY = e.clientY - lastYRef.current;
          lastYRef.current = e.clientY;
          if (deltaY !== 0) {
            vpRef.current = panPrice(vpRef.current, deltaY, candles.length);
            emitViewport(vpRef.current);
          }
        }
      } else if (dragModeRef.current === 'body' && drawingModeRef.current === 'navigate') {
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
      rafRef.current = requestAnimationFrame(() => drawRef.current());
    } else {
      applyCursor(x, y, false);

      const nextHoveredDrawingId =
        drawingModeRef.current === 'navigate' && isPlotBody(x, y)
          ? hitTestAll(x, y, drawings, layoutViewport(vpRef.current), candles, showTimeAxis)
          : null;
      if (hoveredDrawingIdRef.current !== nextHoveredDrawingId) {
        hoveredDrawingIdRef.current = nextHoveredDrawingId;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawRef.current());
      }

      if (
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current !== 'navigate'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawRef.current());
        return;
      }

      if (suppressCrosshairRef.current) return;

      const vp = layoutViewport(vpRef.current);
      const pw = plotWidth(width, priceScaleSide);
      const ph = plotHeight(height, showTimeAxis);
      const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
      let crosshairX = Math.max(0, Math.min(pw, x - plotOffset));
      const plotY = Math.max(0, Math.min(ph, y));

      const idx = vp.indexForX(crosshairX);
      if (idx >= 0 && idx < candles.length) {
        const candleCenterX = vp.xForIndex(idx);
        if (Math.abs(crosshairX - candleCenterX) <= 10) {
          crosshairX = candleCenterX;
        }
      }

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
    axisDragSnapshotRef.current = null;
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
        drawRef.current();
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
      drawRef.current();
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
          drawRef.current();
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
