'use client';

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import type { Candle, VisibleRange, Theme, SerializedDrawing, IndicatorConfig, Interval, CrosshairMoveEvent } from './contracts';
import type { ViewportState } from './viewport';
import type { RegisterPane } from './paneHandle';
import type { WheelAction } from './wheel';
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
} from './viewport';
import { applyPanePriceScale, resetPanePriceScale } from './indicatorScale';
import {
  resolveDragMode,
  resolveHoverCursor,
  PRICE_AXIS_WIDTH,
  plotHeight,
  plotWidth,
  type ChartCursor,
  type DragMode,
} from './layout';
import { drawGrid, drawCandles, drawLastPrice, drawAxes } from './renderer';
import { formatAxisTime } from './time';
import { formatCrosshairValue, shouldClearCrosshairOnLeave } from './crosshair';
import { DrawingRegistry, IndicatorRegistry } from './pluginHost';
import { clampPlot } from './drawingCoords';
import type { DrawingPointerEvent } from './drawingController';
import { sortDrawingsByZ } from './drawings/primitives';

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
  onDrawingPointer?: (event: DrawingPointerEvent) => void;
  onDrawingContextMenu?: (event: DrawingPointerEvent & { clientX: number; clientY: number }) => void;
  suppressCrosshair?: boolean;
  /** `'__cursor__'` for navigate mode; drawing tool name when placing overlays. */
  activeTool?: string;
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
  suppressCrosshair = false,
  activeTool = '__cursor__',
}: Props) {
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
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;
  const onDrawingPointerRef = useRef(onDrawingPointer);
  onDrawingPointerRef.current = onDrawingPointer;
  const drawingModeRef = useRef(drawingMode);
  drawingModeRef.current = drawingMode;
  const suppressCrosshairRef = useRef(suppressCrosshair);
  suppressCrosshairRef.current = suppressCrosshair;
  const drawingDragRef = useRef(false);

  const toPlotEvent = (e: React.MouseEvent, phase: DrawingPointerEvent['phase']): DrawingPointerEvent => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const plot = clampPlot(x, y, width, height, showTimeAxis);
    return { phase, plotX: plot.x, plotY: plot.y, button: e.button };
  };

  const isPlotBody = (x: number, y: number) =>
    resolveDragMode(x, y, width, height, showTimeAxis) === 'body';

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
    });
    if (appliedCursorRef.current === cursor) return;
    appliedCursorRef.current = cursor;
    canvas.style.cursor = cursor;
  }, [width, height, showTimeAxis]);

  const resetCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    appliedCursorRef.current = 'default';
    canvas.style.cursor = 'default';
  }, []);

  const isPricePane = paneId === 'price';

  const fitPriceScale = useCallback(
    (vp: VisibleRange) => applyPanePriceScale(vp, candles, paneId, indicators),
    [candles, paneId, indicators]
  );

  const fitPriceScaleIfAuto = useCallback(
    (vp: VisibleRange) => {
      if ((vp.priceScaleMode ?? 'auto') === 'manual') return vp;
      return fitPriceScale(vp);
    },
    [fitPriceScale]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vpRef.current) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const vp = vpRef.current;

    drawGrid(ctx, vp, width, height, theme);
    if (isPricePane) {
      drawCandles(ctx, candles, vp, theme, chartType as any);
    }

    for (const ind of indicators) {
      const plugin = IndicatorRegistry.get(ind.name);
      if (plugin) {
        plugin.draw(ctx, candles, vp, theme, ind.params);
      }
    }

    for (const d of sortDrawingsByZ(drawings)) {
      if (!d.visible) continue;
      const plugin = DrawingRegistry.get(d.name);
      if (plugin) {
        const selected = d.id === selectedDrawingId;
        plugin.draw(ctx, d, vp, theme, selected, candles, { showTimeAxis });
      }
    }

    if (previewDrawing && previewDrawing.visible !== false) {
      const plugin = DrawingRegistry.get(previewDrawing.name);
      if (plugin) {
        plugin.draw(ctx, previewDrawing, vp, theme, false, candles, {
          preview: true,
          showTimeAxis,
        });
      }
    }

    drawAxes(ctx, vp, width, height, theme, candles, interval, showTimeAxis);

    const last = candles[candles.length - 1];
    const lastClose = last?.c;
    if (Number.isFinite(lastClose) && paneId === 'price') {
      drawLastPrice(ctx, lastClose as number, vp, width, theme);
    }
  }, [candles, chartType, theme, width, height, drawings, previewDrawing, selectedDrawingId, indicators, paneId, interval, isPricePane, showTimeAxis]);

  // Init viewport when data or size changes
  useEffect(() => {
    if (candles.length === 0) return;
    const prev = prevDimsRef.current;
    const dimsOnly = vpRef.current && prev.width === width && prev.height === height;
    if (dimsOnly && vpRef.current) {
      let vp = refreshViewportForDataChange(vpRef.current, candles, width, height);
      vp = fitPriceScaleIfAuto(vp);
      vpRef.current = vp;
      emitViewport(vp);
      drawRef.current();
      prevDimsRef.current = { width, height };
      return;
    }
    if (!vpRef.current) {
      vpRef.current = getDefaultViewport(candles, width, height);
    } else {
      vpRef.current = refreshViewportForDataChange(vpRef.current, candles, width, height);
    }
    vpRef.current = fitPriceScaleIfAuto(vpRef.current!);
    emitViewport(vpRef.current!);
    drawRef.current();
    prevDimsRef.current = { width, height };
  }, [candles, width, height, fitPriceScaleIfAuto]);

  // Imperative pane registration for time sync + centralized wheel (no React state per tick).
  useEffect(() => {
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

    const applyWheelAction = (action: WheelAction, anchorX: number): VisibleRange | null => {
      if (!vpRef.current || candles.length === 0) return null;
      let vp = vpRef.current;
      if (action.type === 'zoom') {
        vp = zoomVp(vp, action.factor, anchorX, candles.length);
      } else if (action.type === 'pan') {
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
        next = getDefaultViewport(candles, width, height);
      } else {
        next = resetPanePriceScale(vpRef.current, candles, paneId, indicators);
      }
      next = fitPriceScaleIfAuto(next);
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
      applyWheelAction,
      getViewport: () => vpRef.current,
      resetViewport,
      isViewportModified,
    });
  }, [registerPane, paneId, candles, fitPriceScaleIfAuto, width, height, indicators]);

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
    dragModeRef.current = resolveDragMode(x, y, width, height, showTimeAxis);

    const useDrawing =
      isPricePane &&
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
      isPricePane &&
      onDrawingPointerRef.current &&
      isPlotBody(x, y) &&
      drawingModeRef.current === 'navigate'
    ) {
      onDrawingPointerRef.current(toPlotEvent(e, 'down'));
    }

    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    momentumRef.current = 0;
    if (
      vpRef.current &&
      (dragModeRef.current === 'price' || dragModeRef.current === 'timeAxis')
    ) {
      axisDragSnapshotRef.current = snapshotViewport(vpRef.current);
      axisDragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
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
        isPricePane &&
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current === 'navigate' &&
        dragModeRef.current === 'body'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
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
        }
      } else if (dragModeRef.current === 'timeAxis') {
        const snapshot = axisDragSnapshotRef.current;
        if (snapshot) {
          const totalDeltaX = e.clientX - axisDragStartRef.current.clientX;
          vpRef.current = scaleTimeFromInitial(snapshot, totalDeltaX, candles.length);
          emitViewport(vpRef.current);
        }
      } else if (dragModeRef.current === 'body' && drawingModeRef.current === 'navigate') {
        const deltaX = e.clientX - lastXRef.current;
        const deltaY = e.clientY - lastYRef.current;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
        momentumRef.current = deltaX * 0.8;

        let vp = vpRef.current;
        if (deltaX !== 0) {
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
      if (suppressCrosshairRef.current) return;

      if (
        isPricePane &&
        onDrawingPointerRef.current &&
        isPlotBody(x, y) &&
        drawingModeRef.current !== 'navigate'
      ) {
        onDrawingPointerRef.current(toPlotEvent(e, 'move'));
        return;
      }

      const vp = vpRef.current;
      const pw = plotWidth(width);
      const ph = plotHeight(height, showTimeAxis);
      let crosshairX = Math.max(0, Math.min(pw, x));
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
    } else if (onDrawingPointerRef.current && e && isPricePane) {
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
    if (x >= width - PRICE_AXIS_WIDTH) {
      vpRef.current = resetPanePriceScale(vpRef.current, candles, paneId, indicators);
      emitViewport(vpRef.current);
      drawRef.current();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onDrawingContextMenu || !isPricePane) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const plot = clampPlot(e.clientX - rect.left, e.clientY - rect.top, width, height, showTimeAxis);
    onDrawingContextMenu({
      phase: 'down',
      plotX: plot.x,
      plotY: plot.y,
      button: 2,
      clientX: e.clientX,
      clientY: e.clientY,
    });
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
