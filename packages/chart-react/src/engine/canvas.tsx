'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type {
  Candle,
  VisibleRange,
  Theme,
  SerializedDrawing,
  IndicatorConfig,
  Interval,
  CrosshairMoveEvent,
  Range,
  ChartEventMarker,
  ChartReferenceLine,
  ChartAnnotationChannelMarker,
} from '@edge/chart-core';
import type { ChartSettings } from './chartSettings';
import { mergeChartSettings } from './chartSettings';
import type { RegisterPane } from './paneHandle';
import type { DrawingPointerEvent } from '@edge/chart-core/drawingController';
import { shouldClearCrosshairOnLeave } from '@edge/chart-core/crosshair';
import type { DragMode } from '@edge/chart-core/layout';
import type { DrawInvalidationReason } from './renderScheduler';
import { RenderScheduler } from './renderScheduler';
import type { EventBadgeGroup } from './eventBadges';
import type { ActiveGesture } from './paneGesture';
import { useViewportLifecycle } from './useViewportLifecycle';
import { useCanvasRenderer } from './useCanvasRenderer';
import { useCanvasCursor, useCanvasCursorRefs } from './useCanvasCursor';
import { useCanvasGestures } from './useCanvasGestures';

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
  const isPricePane = paneId === 'price';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vpRef = useRef<VisibleRange | null>(null);
  const schedulerRef = useRef<RenderScheduler | null>(null);
  const drawRef = useRef<(reason?: DrawInvalidationReason) => void>(() => {});

  const rafRef = useRef<number | null>(null);
  const momentumRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const dragModeRef = useRef<DragMode>('body');
  const isDraggingRef = useRef(false);
  const lastLocalRef = useRef({ x: 0, y: 0 });
  const activeGestureRef = useRef<ActiveGesture>(null);
  const drawingDragRef = useRef(false);
  const hoveredDrawingIdRef = useRef<string | null>(null);
  const eventBadgeGroupsRef = useRef<EventBadgeGroup[]>([]);
  const hoveredEventBadgeIdRef = useRef<string | null>(null);

  const onUserTimePanRef = useRef(onUserTimePan);
  onUserTimePanRef.current = onUserTimePan;
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;
  const onDrawingPointerRef = useRef(onDrawingPointer);
  onDrawingPointerRef.current = onDrawingPointer;
  const onDrawingContextMenuRef = useRef(onDrawingContextMenu);
  onDrawingContextMenuRef.current = onDrawingContextMenu;
  const drawingModeRef = useRef(drawingMode);
  drawingModeRef.current = drawingMode;
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const suppressCrosshairRef = useRef(suppressCrosshair);
  suppressCrosshairRef.current = suppressCrosshair;
  const onEventBadgeClickRef = useRef(onEventBadgeClick);
  onEventBadgeClickRef.current = onEventBadgeClick;
  const onEventBadgeHoverRef = useRef(onEventBadgeHover);
  onEventBadgeHoverRef.current = onEventBadgeHover;

  type DragCrosshairAnchor = {
    dataIndex: number;
    timestamp: number | null;
    price: number;
  };
  const dragCrosshairAnchorRef = useRef<DragCrosshairAnchor | null>(null);

  const { appliedCursorRef, activeToolRef } = useCanvasCursorRefs(activeTool);

  const { layoutViewport, fitPriceScaleIfAuto, emitViewport, priceScaleSide } =
    useViewportLifecycle({
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
    });

  const { requestDraw, drawNow } = useCanvasRenderer({
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
  });

  const {
    isPlotBody,
    plotCoordsFromClient,
    hitTestEventBadgeAt,
    applyCursor,
    resetCursor,
    handleBadgeHover,
  } = useCanvasCursor({
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
  });

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleContextMenu,
  } = useCanvasGestures({
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
    eventMarkersLength: eventMarkers.length,
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
  });

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
