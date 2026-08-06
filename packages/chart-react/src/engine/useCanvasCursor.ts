import { useCallback, useRef, type RefObject } from 'react';
import type { Candle, SerializedDrawing, VisibleRange } from '@edge/chart-core';
import {
  cursorForControlPointRole,
  resolveDragMode,
  resolveHoverCursor,
  plotLeftOffset,
  type ChartCursor,
  type DragMode,
  type PriceScaleSide,
} from '@edge/chart-core/layout';
import { hitTestAll, getVisibleDrawingsSorted } from '@edge/chart-core';
import { hitTestControlPointDetailed } from '@edge/chart-core/pluginHost';
import { clampPlot } from '@edge/chart-core/drawingCoords';
import { hitTestEventBadge, type EventBadgeGroup } from './eventBadges';
import type { DrawInvalidationReason } from './renderScheduler';
import type { DrawingHoverHit } from '../drawing/drawingHoverHitTest';

type CanvasCursorParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  vpRef: RefObject<VisibleRange | null>;
  width: number;
  height: number;
  showTimeAxis: boolean;
  priceScaleSide: PriceScaleSide;
  isPricePane: boolean;
  layoutViewport: (vp: VisibleRange) => VisibleRange;
  candlesRef: RefObject<Candle[]>;
  drawingsRef: RefObject<SerializedDrawing[]>;
  eventBadgeGroupsRef: RefObject<EventBadgeGroup[]>;
  isDraggingRef: RefObject<boolean>;
  dragModeRef: RefObject<DragMode>;
  appliedCursorRef: RefObject<ChartCursor>;
  activeToolRef: RefObject<string>;
  onEventBadgeHoverRef: RefObject<
    ((group: EventBadgeGroup | null) => void) | undefined
  >;
  hoveredEventBadgeIdRef: RefObject<string | null>;
  requestDraw: (reason: DrawInvalidationReason) => void;
  rafRef: RefObject<number | null>;
};

export function useCanvasCursor({
  canvasRef,
  vpRef,
  width,
  height,
  showTimeAxis,
  priceScaleSide,
  isPricePane,
  layoutViewport,
  candlesRef,
  drawingsRef,
  eventBadgeGroupsRef,
  isDraggingRef,
  dragModeRef,
  appliedCursorRef,
  activeToolRef,
  onEventBadgeHoverRef,
  hoveredEventBadgeIdRef,
  requestDraw,
  rafRef,
}: CanvasCursorParams) {
  const isPlotBody = useCallback(
    (x: number, y: number) =>
      resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide) === 'body',
    [width, height, showTimeAxis, priceScaleSide],
  );

  const plotCoordsFromClient = useCallback(
    (x: number, y: number) => {
      const plotOffset = isPricePane ? plotLeftOffset(priceScaleSide) : 0;
      return { plotX: x - plotOffset, plotY: y };
    },
    [isPricePane, priceScaleSide],
  );

  const hitTestEventBadgeAt = useCallback(
    (x: number, y: number): EventBadgeGroup | null => {
      if (!isPricePane || eventBadgeGroupsRef.current.length === 0) return null;
      const { plotX, plotY } = plotCoordsFromClient(x, y);
      return hitTestEventBadge(plotX, plotY, eventBadgeGroupsRef.current);
    },
    [isPricePane, eventBadgeGroupsRef, plotCoordsFromClient],
  );

  const applyCursor = useCallback(
    (
      x: number,
      y: number,
      isDragging = isDraggingRef.current,
      shiftHeld = false,
      hoverHit?: DrawingHoverHit,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let overControlPoint = false;
      let controlPointLocked = false;
      let controlPointCursor: ChartCursor = 'grab';
      let overDrawing = false;
      if (
        !isDragging &&
        vpRef.current &&
        resolveDragMode(x, y, width, height, showTimeAxis, priceScaleSide) === 'body'
      ) {
        if (hoverHit) {
          overControlPoint = hoverHit.overControlPoint;
          controlPointLocked = hoverHit.controlPointLocked;
          controlPointCursor = hoverHit.controlPointCursor;
          overDrawing = hoverHit.overDrawing;
        } else {
          const plot = clampPlot(x, y, width, height, showTimeAxis);
          const vp = layoutViewport(vpRef.current);
          const candles = candlesRef.current;
          const paneDrawings = drawingsRef.current;
          const visibleSorted = getVisibleDrawingsSorted(paneDrawings);

          for (const drawing of visibleSorted) {
            const hit = hitTestControlPointDetailed(
              plot.x,
              plot.y,
              drawing,
              vp,
              candles,
              showTimeAxis,
            );
            if (hit) {
              overControlPoint = true;
              controlPointLocked = Boolean(drawing.locked);
              controlPointCursor = cursorForControlPointRole(hit.role);
              break;
            }
          }

          if (!overControlPoint) {
            overDrawing =
              hitTestAll(plot.x, plot.y, paneDrawings, vp, candles, showTimeAxis) != null;
          }
        }
      }

      const cursor = resolveHoverCursor(x, y, width, height, {
        showTimeAxis,
        activeTool: activeToolRef.current,
        isDragging,
        dragMode: isDragging ? dragModeRef.current : null,
        priceScaleSide,
        shiftHeld,
        overControlPoint,
        controlPointLocked,
        controlPointCursor,
        overDrawing,
      });
      if (appliedCursorRef.current === cursor) return;
      appliedCursorRef.current = cursor;
      canvas.style.cursor = cursor;
    },
    [
      canvasRef,
      vpRef,
      width,
      height,
      showTimeAxis,
      priceScaleSide,
      layoutViewport,
      candlesRef,
      drawingsRef,
      isDraggingRef,
      dragModeRef,
      appliedCursorRef,
      activeToolRef,
    ],
  );

  const resetCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    appliedCursorRef.current = 'default';
    canvas.style.cursor = 'default';
  }, [canvasRef, appliedCursorRef]);

  const handleBadgeHover = useCallback(
    (x: number, y: number) => {
      if (!isPricePane || eventBadgeGroupsRef.current.length === 0) return false;

      const badge = hitTestEventBadgeAt(x, y);
      const nextBadgeId = badge?.id ?? null;
      if (hoveredEventBadgeIdRef.current !== nextBadgeId) {
        hoveredEventBadgeIdRef.current = nextBadgeId;
        onEventBadgeHoverRef.current?.(badge);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => requestDraw('crosshair'));
      }
      if (badge) {
        if (
          appliedCursorRef.current !== 'grab' &&
          appliedCursorRef.current !== 'not-allowed'
        ) {
          const canvas = canvasRef.current;
          if (canvas && appliedCursorRef.current !== 'pointer') {
            appliedCursorRef.current = 'pointer';
            canvas.style.cursor = 'pointer';
          }
        }
        return true;
      }
      return false;
    },
    [
      isPricePane,
      eventBadgeGroupsRef,
      hitTestEventBadgeAt,
      hoveredEventBadgeIdRef,
      onEventBadgeHoverRef,
      rafRef,
      requestDraw,
      appliedCursorRef,
      canvasRef,
    ],
  );

  return {
    isPlotBody,
    plotCoordsFromClient,
    hitTestEventBadgeAt,
    applyCursor,
    resetCursor,
    handleBadgeHover,
  };
}

export function useCanvasCursorRefs(activeTool: string) {
  const appliedCursorRef = useRef<ChartCursor>('default');
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  return { appliedCursorRef, activeToolRef };
}
