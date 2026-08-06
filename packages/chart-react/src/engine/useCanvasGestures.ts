import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type {
  Candle,
  VisibleRange,
  SerializedDrawing,
  IndicatorConfig,
  Interval,
  CrosshairMoveEvent,
} from '@edge/chart-core';
import type { DrawingPointerEvent } from '@edge/chart-core/drawingController';
import {
  resolveDragMode,
  isPriceAxisHit,
  plotWidth,
  plotHeight,
  plotLeftOffset,
  type DragMode,
  type PriceScaleSide,
} from '@edge/chart-core/layout';
import {
  pan as panVp,
  applyMomentum,
  scalePriceFromInitial,
  scaleTimeFromInitial,
  panPrice,
  attachViewportHelpers,
  ensureRightMarginBars,
} from './viewport';
import { resetPanePriceScale } from './indicatorScale';
import { formatAxisTime } from '@edge/chart-core/time';
import {
  formatCrosshairValue,
  snapCrosshairXToBar,
  xForBarCenter,
} from '@edge/chart-core/crosshair';
import { clampPlot } from '@edge/chart-core/drawingCoords';
import {
  computeDrawingHoverHit,
  type DrawingHoverHit,
} from '../drawing/drawingHoverHitTest';
import { snapshotViewport, type ActiveGesture } from './paneGesture';
import type { EventBadgeGroup } from './eventBadges';
import type { RequiredChartSettings } from './chartSettings';
import type { DrawInvalidationReason } from './renderScheduler';

type DragCrosshairAnchor = {
  dataIndex: number;
  timestamp: number | null;
  price: number;
};

type MouseGestureEvent = Pick<
  MouseEvent,
  'button' | 'clientX' | 'clientY' | 'detail' | 'shiftKey' | 'target'
>;

type CanvasGesturesParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  vpRef: RefObject<VisibleRange | null>;
  width: number;
  height: number;
  showTimeAxis: boolean;
  priceScaleSide: PriceScaleSide;
  isPricePane: boolean;
  paneId: string;
  candles: Candle[];
  drawings: SerializedDrawing[];
  indicators: IndicatorConfig[];
  interval?: Interval;
  chartSettings: RequiredChartSettings;
  chartSettingsRef: RefObject<RequiredChartSettings>;
  eventMarkersLength: number;
  layoutViewport: (vp: VisibleRange) => VisibleRange;
  fitPriceScaleIfAuto: (vp: VisibleRange) => VisibleRange;
  emitViewport: (vp: VisibleRange) => void;
  requestDraw: (reason: DrawInvalidationReason) => void;
  drawNow: (reason: DrawInvalidationReason) => void;
  isPlotBody: (x: number, y: number) => boolean;
  plotCoordsFromClient: (x: number, y: number) => { plotX: number; plotY: number };
  hitTestEventBadgeAt: (x: number, y: number) => EventBadgeGroup | null;
  applyCursor: (
    x: number,
    y: number,
    isDragging?: boolean,
    shiftHeld?: boolean,
    hoverHit?: DrawingHoverHit,
  ) => void;
  handleBadgeHover: (x: number, y: number) => boolean;
  rafRef: RefObject<number | null>;
  momentumRef: RefObject<number>;
  lastXRef: RefObject<number>;
  lastYRef: RefObject<number>;
  dragModeRef: RefObject<DragMode>;
  isDraggingRef: RefObject<boolean>;
  lastLocalRef: RefObject<{ x: number; y: number }>;
  activeGestureRef: RefObject<ActiveGesture>;
  onCrosshairMoveRef: RefObject<
    ((event: CrosshairMoveEvent | null) => void) | undefined
  >;
  onDrawingPointerRef: RefObject<
    ((event: DrawingPointerEvent) => boolean | void) | undefined
  >;
  onDrawingContextMenuRef: RefObject<
    | ((
        event: DrawingPointerEvent & { clientX: number; clientY: number },
      ) => boolean | void)
    | undefined
  >;
  onPriceScaleContextMenu?: (pos: {
    clientX: number;
    clientY: number;
    priceScaleMode: 'auto' | 'manual';
  }) => void;
  onEventBadgeClickRef: RefObject<
    | ((
        group: EventBadgeGroup,
        pos: { clientX: number; clientY: number; plotX: number; plotY: number },
      ) => void)
    | undefined
  >;
  onUserTimePanRef: RefObject<(() => void) | undefined>;
  drawingModeRef: RefObject<'navigate' | 'create' | 'edit'>;
  drawingsRef: RefObject<SerializedDrawing[]>;
  candlesRef: RefObject<Candle[]>;
  suppressCrosshairRef: RefObject<boolean>;
  drawingDragRef: RefObject<boolean>;
  hoveredDrawingIdRef: RefObject<string | null>;
  dragCrosshairAnchorRef: RefObject<DragCrosshairAnchor | null>;
  hoverHitRafRef: RefObject<number | null>;
  pendingHoverRef: RefObject<{ x: number; y: number; shiftKey: boolean } | null>;
};

export function useCanvasGestures({
  canvasRef,
  vpRef,
  width,
  height,
  showTimeAxis,
  priceScaleSide,
  isPricePane,
  paneId,
  candles,
  drawings,
  indicators,
  interval,
  chartSettings,
  chartSettingsRef,
  eventMarkersLength,
  layoutViewport,
  fitPriceScaleIfAuto,
  emitViewport,
  requestDraw,
  drawNow,
  isPlotBody,
  plotCoordsFromClient,
  hitTestEventBadgeAt,
  applyCursor,
  handleBadgeHover,
  rafRef,
  momentumRef,
  lastXRef,
  lastYRef,
  dragModeRef,
  isDraggingRef,
  lastLocalRef,
  activeGestureRef,
  onCrosshairMoveRef,
  onDrawingPointerRef,
  onDrawingContextMenuRef,
  onPriceScaleContextMenu,
  onEventBadgeClickRef,
  onUserTimePanRef,
  drawingModeRef,
  drawingsRef,
  candlesRef,
  suppressCrosshairRef,
  drawingDragRef,
  hoveredDrawingIdRef,
  dragCrosshairAnchorRef,
  hoverHitRafRef,
  pendingHoverRef,
}: CanvasGesturesParams) {
  const toPlotEvent = useCallback(
    (e: MouseGestureEvent, phase: DrawingPointerEvent['phase']): DrawingPointerEvent => {
      const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const plot = clampPlot(x, y, width, height, showTimeAxis);
      return {
        phase,
        plotX: plot.x,
        plotY: plot.y,
        button: e.button,
        detail: e.detail,
        shiftKey: e.shiftKey,
        paneId,
      };
    },
    [canvasRef, width, height, showTimeAxis, paneId],
  );

  const emitCrosshairMove = useCallback(
    (localX: number, localY: number, anchor: DragCrosshairAnchor | null) => {
      if (suppressCrosshairRef.current || !vpRef.current) return;

      const vp = layoutViewport(vpRef.current);
      const pw = plotWidth(width, priceScaleSide);
      const ph = plotHeight(
        height,
        showTimeAxis,
        isPricePane && eventMarkersLength > 0 && showTimeAxis,
      );
      const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
      const lockedPlotX = chartSettingsRef.current.canvas.lockCrosshairToTime
        ? chartSettingsRef.current.canvas.lockedCrosshairPlotX
        : null;
      const useLockedPlotX =
        typeof lockedPlotX === 'number' && Number.isFinite(lockedPlotX);

      let crosshairX: number;
      let plotY: number;
      let idx: number;

      if (anchor && !useLockedPlotX) {
        idx = anchor.dataIndex;
        crosshairX = xForBarCenter(idx, vp);
        plotY = Math.max(0, Math.min(ph, vp.yForPrice(anchor.price)));
      } else {
        const pointerCrosshairX = Math.max(0, Math.min(pw, localX - plotOffset));
        if (useLockedPlotX) {
          crosshairX = Math.max(0, Math.min(pw, lockedPlotX));
          idx = vp.indexForX(crosshairX);
        } else {
          // Snap vertical line to the center of the bar under the pointer.
          const snapped = snapCrosshairXToBar(pointerCrosshairX, vp);
          crosshairX = Math.max(0, Math.min(pw, snapped.plotX));
          idx = snapped.dataIndex;
        }
        plotY = Math.max(0, Math.min(ph, localY));
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
        showTimeAxis,
      );

      onCrosshairMoveRef.current?.({
        paneId,
        plotX: crosshairX,
        plotY,
        localY: anchor && !useLockedPlotX ? plotY : localY,
        timestamp: anchor && !useLockedPlotX ? anchor.timestamp : candle?.t ?? null,
        dataIndex: idx,
        valueLabel,
        timeLabel,
      });
    },
    [
      suppressCrosshairRef,
      vpRef,
      layoutViewport,
      width,
      priceScaleSide,
      height,
      showTimeAxis,
      isPricePane,
      eventMarkersLength,
      chartSettingsRef,
      candles,
      interval,
      indicators,
      paneId,
      onCrosshairMoveRef,
    ],
  );

  const captureDragCrosshairAnchor = useCallback(
    (localX: number, localY: number): DragCrosshairAnchor | null => {
      if (!vpRef.current) return null;

      const vp = layoutViewport(vpRef.current);
      const pw = plotWidth(width, priceScaleSide);
      const ph = plotHeight(
        height,
        showTimeAxis,
        isPricePane && eventMarkersLength > 0 && showTimeAxis,
      );
      const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
      const pointerCrosshairX = Math.max(0, Math.min(pw, localX - plotOffset));
      const lockedPlotX = chartSettingsRef.current.canvas.lockCrosshairToTime
        ? chartSettingsRef.current.canvas.lockedCrosshairPlotX
        : null;
      const crosshairX =
        typeof lockedPlotX === 'number' && Number.isFinite(lockedPlotX)
          ? Math.max(0, Math.min(pw, lockedPlotX))
          : pointerCrosshairX;
      const plotY = Math.max(0, Math.min(ph, localY));
      const idx = vp.indexForX(crosshairX);
      const candle = idx >= 0 && idx < candles.length ? candles[idx] : null;

      return {
        dataIndex: idx,
        timestamp: candle?.t ?? null,
        price: vp.priceForY(plotY),
      };
    },
    [
      vpRef,
      layoutViewport,
      width,
      priceScaleSide,
      height,
      showTimeAxis,
      isPricePane,
      eventMarkersLength,
      chartSettingsRef,
      candles,
    ],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (hoverHitRafRef.current) {
      cancelAnimationFrame(hoverHitRafRef.current);
      hoverHitRafRef.current = null;
    }
    pendingHoverRef.current = null;
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
        applyCursor(x, y, false, e.shiftKey);
        return;
      }
    }

    const useDrawing =
      onDrawingPointerRef.current &&
      isPlotBody(x, y) &&
      drawingModeRef.current !== 'navigate';

    if (useDrawing) {
      dragCrosshairAnchorRef.current = null;
      drawingDragRef.current = true;
      isDraggingRef.current = true;
      onDrawingPointerRef.current!(toPlotEvent(e, 'down'));
      applyCursor(x, y, true, e.shiftKey);
      return;
    }

    if (
      onDrawingPointerRef.current &&
      isPlotBody(x, y) &&
      drawingModeRef.current === 'navigate'
    ) {
      const consumed = onDrawingPointerRef.current(toPlotEvent(e, 'down'));
      if (consumed) {
        dragCrosshairAnchorRef.current = null;
        drawingDragRef.current = true;
        isDraggingRef.current = true;
        applyCursor(x, y, true, e.shiftKey);
        return;
      }
    }

    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    momentumRef.current = 0;
    dragCrosshairAnchorRef.current =
      isPlotBody(x, y) && drawingModeRef.current === 'navigate'
        ? captureDragCrosshairAnchor(x, y)
        : null;
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
    applyCursor(x, y, true, e.shiftKey);
  };

  const handleMouseMove = (e: MouseGestureEvent) => {
    if (!vpRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastLocalRef.current = { x, y };

    if (isDraggingRef.current) {
      applyCursor(x, y, true, e.shiftKey);

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
          showTimeAxis,
        );
        emitViewport(vpRef.current);
      } else if (activeGesture?.type === 'timeScale') {
        const totalDeltaX = e.clientX - activeGesture.startX;
        if (totalDeltaX !== 0) onUserTimePanRef.current?.();
        vpRef.current = scaleTimeFromInitial(
          activeGesture.initial,
          totalDeltaX,
          candles.length,
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
      if (!suppressCrosshairRef.current) {
        const locked = chartSettingsRef.current.canvas.lockCrosshairToTime;
        if (locked || dragCrosshairAnchorRef.current) {
          emitCrosshairMove(
            x,
            y,
            locked ? null : dragCrosshairAnchorRef.current,
          );
        }
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => requestDraw('viewport'));
    } else {
      if (handleBadgeHover(x, y)) return;

      pendingHoverRef.current = { x, y, shiftKey: e.shiftKey };
      if (hoverHitRafRef.current == null) {
        hoverHitRafRef.current = requestAnimationFrame(() => {
          hoverHitRafRef.current = null;
          const pending = pendingHoverRef.current;
          if (!pending || !vpRef.current) return;

          const plot = clampPlot(pending.x, pending.y, width, height, showTimeAxis);
          const vp = layoutViewport(vpRef.current);
          const hoverHit = computeDrawingHoverHit(
            plot.x,
            plot.y,
            drawingsRef.current,
            vp,
            candlesRef.current,
            showTimeAxis,
          );

          const nextHoveredDrawingId =
            drawingModeRef.current === 'navigate' && isPlotBody(pending.x, pending.y)
              ? hoverHit.hoveredDrawingId
              : null;
          if (hoveredDrawingIdRef.current !== nextHoveredDrawingId) {
            hoveredDrawingIdRef.current = nextHoveredDrawingId;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => requestDraw('drawings'));
          }

          applyCursor(pending.x, pending.y, false, pending.shiftKey, hoverHit);
        });
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

      emitCrosshairMove(x, y, null);
    }
  };

  const handleMouseUp = (e?: MouseGestureEvent) => {
    if (drawingDragRef.current && onDrawingPointerRef.current && e) {
      onDrawingPointerRef.current(toPlotEvent(e, 'up'));
    } else if (onDrawingPointerRef.current && e) {
      const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isPlotBody(x, y)) {
        onDrawingPointerRef.current(toPlotEvent(e, 'up'));
      }
    }
    drawingDragRef.current = false;
    isDraggingRef.current = false;
    dragCrosshairAnchorRef.current = null;
    activeGestureRef.current = null;
    applyCursor(lastLocalRef.current.x, lastLocalRef.current.y, false, e?.shiftKey ?? false);
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

    if (!onDrawingContextMenuRef.current || !isPricePane) return;
    e.preventDefault();
    const plot = clampPlot(x, y, width, height, showTimeAxis);
    const consumed = onDrawingContextMenuRef.current({
      phase: 'down',
      plotX: plot.x,
      plotY: plot.y,
      button: 2,
      clientX: e.clientX,
      clientY: e.clientY,
    });
    if (consumed) e.stopPropagation();
  };

  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);
  handleMouseMoveRef.current = handleMouseMove;
  handleMouseUpRef.current = handleMouseUp;

  useEffect(() => {
    const handleDocumentMouseMove = (event: MouseEvent) => {
      if (
        !drawingDragRef.current ||
        !isDraggingRef.current ||
        event.target === canvasRef.current
      ) {
        return;
      }
      handleMouseMoveRef.current(event);
    };
    const handleDocumentMouseUp = (event: MouseEvent) => {
      if (
        !drawingDragRef.current ||
        !isDraggingRef.current ||
        event.target === canvasRef.current
      ) {
        return;
      }
      handleMouseUpRef.current(event);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove, true);
    document.addEventListener('mouseup', handleDocumentMouseUp, true);
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove, true);
      document.removeEventListener('mouseup', handleDocumentMouseUp, true);
    };
  }, [canvasRef, drawingDragRef, isDraggingRef]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleContextMenu,
  };
}
