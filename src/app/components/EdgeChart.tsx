'use client';

import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CellConfig,
  Theme,
  IndicatorConfig,
  TrackedOverlay,
  SerializedDrawing,
} from '@/lib/chartConfig';
import type { VisibleRange, CrosshairMoveEvent, CrosshairState, PaneSegment, DrawingStyles, DrawingMetadata } from '@/lib/chart/contracts';
import { mergeMetadata } from '@/lib/chart/annotationMetadata';
import type { ChartPaneHandle, RegisterPane } from '@/lib/chart/paneHandle';
import { PRICE_PANE_KEY } from '@/lib/chartConfig';
import ChartCanvas from '@/lib/chart/canvas';
import CrosshairOverlay from '@/lib/chart/CrosshairOverlay';
import { mergeChartSettings, resolvePriceScaleSide, type ChartSettings } from '@/lib/chart/chartSettings';
import ChartLegendBar from './ChartLegendBar';
import PaneLegendBar from './PaneLegendBar';
import { resolveIndicatorLegend, appendLegendSettingsAction, indicatorHasSettings } from '@/lib/chart/legend';
import { IndicatorRegistry } from '@/lib/chart/pluginHost';
import { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT, type PaneLayout } from '@/lib/chart/panes';
import PaneSeparators from './PaneSeparators';
import PaneControlBar from './PaneControlBar';
import { fetchYahooCandles, applyVisibleSlice, mergeCandlesPrepend, fetchOlderCandles, shouldPrefetchEdge, transformCandlesForChartType, ensureCandlesCover } from '@/lib/chart/series';
import type { Candle, Range, Interval } from '@/lib/chart/contracts';
import { buildCandleSessionKey, resolveViewportRevision } from '@/lib/chart/rangePresetTransition';
import { goToDate, goToRange, type GoToRequest, type GoToResult } from '@/lib/chart/goTo';
import { hitTestAll, hitTestControlPoint, restoreAll, serializeAll } from '@/lib/chart/pluginHost';
import { DrawingStore, pointsEqual } from '@/lib/chart/drawingStore';
import { plotToPoint, translateDrawingPoints } from '@/lib/chart/drawingCoords';
import {
  type DrawingControllerState,
  type DrawingPointerEvent,
  initialDrawingState,
  armTool,
  disarmTool,
  selectDrawing as selectDrawingState,
  cancelPlacing,
  startPlacing,
  commitDrawing,
  createDraftFromPoint,
  isOnePointTool,
  isTwoPointTool,
  isMultiPointTool,
  isDraftComplete,
  advancePlacing,
  supportsDoubleClickFinish,
  isDoubleClickFinish,
  finishPlacingIfComplete,
  startDraggingCp,
  stopDraggingCp,
  startDraggingDrawing,
  stopDraggingDrawing,
  drawingModeFromState,
  shouldHideCrosshair,
  shouldSuppressPan,
  newDrawingId,
  getPluginForTool,
} from '@/lib/chart/drawingController';
import {
  cloneDrawingPayload,
  cloneDrawingsForPaste,
  DUPLICATE_ANCHOR,
  type DrawingClipboardItem,
  type PasteAnchor,
} from '@/lib/chart/drawingClone';
import {
  mergeWheelBatch,
  normalizeWheelDelta,
  zoomFactorForDelta,
} from '@/lib/chart/wheel';
import { createPinchHandler } from '@/lib/chart/pinch';
import {
  adjustViewportForPrepend,
} from '@/lib/chart/viewport';
import {
  buildSyncedCrosshairState,
  clampIndexToViewport,
  crosshairStatesEqual,
  findDataIndexForTimestamp,
} from '@/lib/chart/crosshair';
import { plotLeftOffset } from '@/lib/chart/layout';

export type DrawingScreenBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type IndicatorKey = string;

export function indicatorKey(ind: IndicatorConfig): IndicatorKey {
  return ind.id;
}

export function parseIndicatorKey(
  key: IndicatorKey,
  indicators: IndicatorConfig[],
): IndicatorConfig | null {
  return indicators.find((ind) => ind.id === key) ?? null;
}

export function legacyParseIndicatorKey(key: IndicatorKey): Pick<IndicatorConfig, 'name' | 'pane'> | null {
  const parts = key.split('::');
  if (parts.length < 2) return null;
  const pane = parts.pop() as 'main' | 'sub';
  return { name: parts.join('::'), pane };
}

export type { GoToRequest, GoToResult } from '@/lib/chart/goTo';

export type ChartHandle = {
  startDrawing: (overlayName: string) => void;
  stopDrawing: () => void;
  clearDrawings: () => void;
  setMagnet: (on: boolean) => void;
  serializeDrawings: () => SerializedDrawing[];
  restoreDrawings: (data: SerializedDrawing[]) => void;
  resize: () => void;
  onCrosshair: (cb: (timestamp: number | null) => void) => () => void;
  setCrosshairFromSync: (timestamp: number | null) => void;
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  pasteDrawings: (items: DrawingClipboardItem[], anchor: PasteAnchor) => string[];
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
  resetChartView: () => void;
  /** Reset price Y scale to auto, restore live-edge right margin; optional settings for scale-type switch. */
  resetPriceScaleWindow: (settingsOverride?: ChartSettings) => void;
  isViewportModified: () => boolean;
  getSelectedDrawingId: () => string | null;
  selectDrawing: (id: string | null) => void;
  onSelectionChange: (cb: (id: string | null) => void) => () => void;
  getMagnetEnabled: () => boolean;
  setKeepDrawingMode: (on: boolean) => void;
  getKeepDrawingMode: () => boolean;
  zoomIn: () => void;
  lockAllDrawings: (locked: boolean) => void;
  areAllDrawingsLocked: () => boolean;
  setAllDrawingsVisible: (visible: boolean) => void;
  areAllDrawingsHidden: () => boolean;
  updateDrawingStyles: (id: string, patch: Partial<DrawingStyles>) => void;
  updateDrawingMetadata: (id: string, patch: DrawingMetadata) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getRawCandleCount: () => number;
  getCandles: () => Candle[];
  goTo: (req: GoToRequest) => Promise<GoToResult>;
  getLastCandleTimestamp: () => number | null;
  getDrawingScreenBounds: (id: string) => DrawingScreenBounds | null;
};

type Props = {
  config: CellConfig;
  theme: Theme;
  visibleCount?: number | null;
  chartId: string;
  onConfigChange?: (next: CellConfig) => void;
  onOverlayRightClick?: (overlay: TrackedOverlay, pos: { x: number; y: number }) => void;
  onChartContextMenu?: (pos: { x: number; y: number }) => void;
  onPriceScaleContextMenu?: (pos: {
    clientX: number;
    clientY: number;
    priceScaleMode: 'auto' | 'manual';
  }) => void;
  onRemoveIndicator?: (id: string) => void;
  onCollapseIndicator?: (key: IndicatorKey) => void;
  onMaximizeIndicator?: (key: IndicatorKey) => void;
  onMoveIndicatorUp?: (key: IndicatorKey) => void;
  onMoveIndicatorDown?: (key: IndicatorKey) => void;
  onPaneHeightsChange?: (heights: Record<string, number>) => void;
  collapsedKeys?: Set<IndicatorKey>;
  maximizedKey?: IndicatorKey | null;
  paneOrder?: string[];
  /** Fired when the local crosshair moves (for multi-chart sync). Not fired during sync apply. */
  onCrosshairTimestamp?: (timestamp: number | null) => void;
  /** Fired when drawing mode returns to cursor (e.g. after placing with keep-drawing off). */
  onDrawingDisarmed?: () => void;
  /** Fired after initial candle load for symbol/range/interval/chartType. */
  onDataLoaded?: (info: { count: number }) => void;
  /** Fired when displayed candles change (chart type transform + Bar Replay slice). */
  onCandlesChange?: (candles: Candle[]) => void;
  /** Fired when crosshair moves locally (includes dataIndex for Object Tree). */
  onCrosshairMove?: (ev: {
    timestamp: number | null;
    dataIndex: number | null;
    valueLabel: string | null;
  }) => void;
  /** Fired when a legend action button is clicked (e.g. settings-{indicatorId}). */
  onLegendAction?: (actionId: string) => void;
  compact?: boolean;
};

const EdgeChart = forwardRef<ChartHandle, Props>(function EdgeChart(props, ref) {
  const {
    config,
    theme,
    visibleCount = null,
    onConfigChange,
    onOverlayRightClick,
    onChartContextMenu,
    onPriceScaleContextMenu,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    onRemoveIndicator,
    onCollapseIndicator,
    onMaximizeIndicator,
    onMoveIndicatorUp,
    onMoveIndicatorDown,
    onPaneHeightsChange,
    onCrosshairTimestamp,
    onDrawingDisarmed,
    onDataLoaded,
    onCandlesChange,
    onCrosshairMove,
    onLegendAction,
    compact = false,
  } = props;

  const onDataLoadedRef = useRef(onDataLoaded);
  onDataLoadedRef.current = onDataLoaded;

  const onCandlesChangeRef = useRef(onCandlesChange);
  onCandlesChangeRef.current = onCandlesChange;

  const onCrosshairTimestampRef = useRef(onCrosshairTimestamp);
  onCrosshairTimestampRef.current = onCrosshairTimestamp;

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const onLegendActionRef = useRef(onLegendAction);
  onLegendActionRef.current = onLegendAction;

  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [baseCandles, setBaseCandles] = useState<Candle[]>([]);
  const displayCandles = useMemo(() => {
    const transformed = transformCandlesForChartType(baseCandles, config.chartType);
    return applyVisibleSlice(transformed, visibleCount);
  }, [baseCandles, config.chartType, visibleCount]);

  /** Config identity — viewport reset on session change, not on history prepend. */
  const candleSessionKey = useMemo(
    () => buildCandleSessionKey(config.symbol, config.range, config.interval),
    [config.symbol, config.range, config.interval],
  );

  /** Session key for candles currently displayed (matches fetch, not pending config). */
  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null);
  const fetchGenerationRef = useRef(0);

  /** Bumps when candle session changes or first load completes; stable across edge prepend and rangePreset changes. */
  const viewportRevision = useMemo(
    (): string | undefined =>
      resolveViewportRevision(
        baseCandles.length,
        loadedSessionKey,
        candleSessionKey,
        candleSessionKey,
      ),
    [candleSessionKey, baseCandles.length, loadedSessionKey],
  );

  /** Interval matching the candles currently on screen (avoids axis flash during refetch). */
  const [displayInterval, setDisplayInterval] = useState<Interval>(config.interval);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
  const [drawTick, setDrawTick] = useState(0);
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
  const crosshairStateRef = useRef<CrosshairState | null>(null);
  const crosshairRafRef = useRef<number | null>(null);
  const pendingCrosshairRef = useRef<
    { kind: 'move'; event: CrosshairMoveEvent } | { kind: 'clear' } | null
  >(null);
  const paneHandlesRef = useRef<Map<string, ChartPaneHandle>>(new Map());
  const wheelingRef = useRef(false);
  const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWheelRef = useRef<{ deltaX: number; deltaY: number; anchorX: number } | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const overlayChangeCbsRef = useRef<Set<() => void>>(new Set());
  const crosshairCbsRef = useRef<Set<(ts: number | null) => void>>(new Set());
  const syncingCrosshairRef = useRef(false);
  const candlesRef = useRef<Candle[]>([]);
  const baseCandlesRef = useRef<Candle[]>([]);
  const fetchStateRef = useRef({ inFlight: false, hasMoreHistory: true, abortController: null as AbortController | null });
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPannedTimeAxisRef = useRef(false);
  const goToImplRef = useRef<(req: GoToRequest) => Promise<GoToResult>>(async () => ({
    ok: false,
    reason: 'no_data',
  }));
  const pendingGoToNavigationRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const drawingsRef = useRef<SerializedDrawing[]>([]);
  const drawingStoreRef = useRef(new DrawingStore());
  const cpDragPointsSnapshotRef = useRef<SerializedDrawing['points'] | null>(null);
  const drawingDragStartRef = useRef<{ plotX: number; plotY: number } | null>(null);
  const activePlacingPaneRef = useRef<string>('price');
  const trackedRef = useRef<Map<string, TrackedOverlay>>(new Map());
  const layoutRef = useRef<PaneLayout | null>(null);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [previewDrawing, setPreviewDrawing] = useState<SerializedDrawing | null>(null);
  const [drawingFsm, setDrawingFsm] = useState<DrawingControllerState>(initialDrawingState());
  const [dragHeights, setDragHeights] = useState<Record<string, number> | null>(null);
  const dragHeightsRef = useRef<Record<string, number> | null>(null);
  const drawingStateRef = useRef<DrawingControllerState>(initialDrawingState());
  const magnetEnabledRef = useRef(false);
  const keepDrawingRef = useRef(false);
  const onDrawingDisarmedRef = useRef(onDrawingDisarmed);
  onDrawingDisarmedRef.current = onDrawingDisarmed;
  const selectionChangeCbsRef = useRef<Set<(id: string | null) => void>>(new Set());
  const onOverlayRightClickRef = useRef(onOverlayRightClick);
  onOverlayRightClickRef.current = onOverlayRightClick;

  const syncDrawingState = useCallback((next: DrawingControllerState) => {
    const prev = drawingStateRef.current;
    if (prev.activeTool && !next.activeTool) {
      onDrawingDisarmedRef.current?.();
    }
    drawingStateRef.current = next;
    setDrawingFsm(next);
    setActiveDrawingTool(next.activeTool);
    setSelectedDrawingId(next.selectedId);
  }, []);

  const notifySelectionChange = useCallback((id: string | null) => {
    selectionChangeCbsRef.current.forEach((cb) => cb(id));
  }, []);

  const notifyOverlayChange = useCallback(() => {
    overlayChangeCbsRef.current.forEach((cb) => cb());
    setDrawTick((n) => n + 1);
  }, []);

  const syncTrackedFromDrawings = useCallback((drawings: SerializedDrawing[]) => {
    const ids = new Set(
      drawings.map((d) => d.id).filter((id): id is string => id != null)
    );
    for (const id of [...trackedRef.current.keys()]) {
      if (!ids.has(id)) trackedRef.current.delete(id);
    }
    for (const d of drawings) {
      if (!d.id) continue;
      const existing = trackedRef.current.get(d.id);
      if (existing) {
        existing.visible = d.visible;
        existing.locked = d.locked;
        existing.label = d.label;
        existing.zLevel = d.zLevel;
      } else {
        trackedRef.current.set(d.id, restoreAll([d])[0]);
      }
    }
  }, []);

  const hydrateDrawings = useCallback(
    (data: SerializedDrawing[]) => {
      const withIds = data.map((d, i) => ({ ...d, id: d.id ?? `d${i}` }));
      drawingStoreRef.current.hydrate(withIds);
      drawingsRef.current = drawingStoreRef.current.getDrawings();
      trackedRef.current.clear();
      restoreAll(withIds).forEach((overlay) => {
        trackedRef.current.set(overlay.id, overlay);
      });
      notifyOverlayChange();
    },
    [notifyOverlayChange],
  );

  const addCommittedDrawing = useCallback((drawing: SerializedDrawing) => {
    const id = drawing.id ?? newDrawingId();
    const full: SerializedDrawing = {
      ...drawing,
      id,
      paneId: drawing.paneId ?? activePlacingPaneRef.current,
    };
    drawingStoreRef.current.execute({ type: 'add', drawing: full });
    const overlay = restoreAll([full])[0];
    trackedRef.current.set(id, overlay);
    return id;
  }, []);

  const paneSegmentsRef = useRef<PaneSegment[]>([]);
  const latestVpRef = useRef<VisibleRange | null>(null);

  useEffect(() => {
    return drawingStoreRef.current.subscribe(() => {
      const next = drawingStoreRef.current.getDrawings();
      drawingsRef.current = next;
      syncTrackedFromDrawings(next);
      overlayChangeCbsRef.current.forEach((cb) => cb());
      setDrawTick((n) => n + 1);
    });
  }, [syncTrackedFromDrawings]);

  const finishAfterCommit = useCallback((state: DrawingControllerState): DrawingControllerState => {
    if (!keepDrawingRef.current && state.activeTool) {
      return disarmTool(state);
    }
    return state;
  }, []);

  const applyCrosshairFromSync = useCallback((timestamp: number | null) => {
    syncingCrosshairRef.current = true;
    try {
      if (timestamp == null) {
        crosshairStateRef.current = null;
        setCrosshair(null);
        onCrosshairMoveRef.current?.({
          timestamp: null,
          dataIndex: null,
          valueLabel: null,
        });
        return;
      }

      const series = candlesRef.current;
      const rawIndex = findDataIndexForTimestamp(series, timestamp);
      if (rawIndex < 0) {
        crosshairStateRef.current = null;
        setCrosshair(null);
        return;
      }

      const priceHandle = paneHandlesRef.current.get('price');
      const vp = priceHandle?.getViewport() ?? latestVpRef.current;
      if (!vp) return;

      const segment = paneSegmentsRef.current.find((s) => s.paneId === 'price');
      if (!segment) return;

      const dataIndex = clampIndexToViewport(rawIndex, vp);
      const nextCrosshair = buildSyncedCrosshairState({
        dataIndex,
        vp,
        candles: series,
        indicators: configRef.current.indicators,
        interval: configRef.current.interval,
        segment,
      });
      crosshairStateRef.current = nextCrosshair;
      setCrosshair(nextCrosshair);
      onCrosshairMoveRef.current?.({
        timestamp,
        dataIndex,
        valueLabel: nextCrosshair.valueLabel,
      });
    } finally {
      syncingCrosshairRef.current = false;
    }
  }, []);

  const emitCrosshairCallbacks = useCallback((event: CrosshairMoveEvent | null) => {
    if (syncingCrosshairRef.current) return;
    if (!event) {
      crosshairCbsRef.current.forEach((cb) => cb(null));
      onCrosshairTimestampRef.current?.(null);
      onCrosshairMoveRef.current?.({
        timestamp: null,
        dataIndex: null,
        valueLabel: null,
      });
      return;
    }
    crosshairCbsRef.current.forEach((cb) => cb(event.timestamp));
    onCrosshairTimestampRef.current?.(event.timestamp);
    onCrosshairMoveRef.current?.({
      timestamp: event.timestamp,
      dataIndex: event.dataIndex,
      valueLabel: event.valueLabel,
    });
  }, []);

  const flushCrosshair = useCallback(() => {
    crosshairRafRef.current = null;
    const pending = pendingCrosshairRef.current;
    pendingCrosshairRef.current = null;
    if (!pending) return;

    if (pending.kind === 'clear') {
      if (wheelingRef.current) return;
      if (crosshairStateRef.current === null) return;
      crosshairStateRef.current = null;
      setCrosshair(null);
      emitCrosshairCallbacks(null);
      return;
    }

    const event = pending.event;
    const segment = paneSegmentsRef.current.find((s) => s.paneId === event.paneId);
    if (!segment) return;

    const nextCrosshair: CrosshairState = {
      plotX: event.plotX,
      globalY: segment.top + event.localY,
      activePaneId: event.paneId,
      paneTop: segment.top,
      paneHeight: segment.height,
      paneReserveTimeAxis: segment.showTimeAxis,
      timestamp: event.timestamp,
      dataIndex: event.dataIndex,
      valueLabel: event.valueLabel,
      timeLabel: event.timeLabel,
    };

    if (crosshairStatesEqual(crosshairStateRef.current, nextCrosshair)) return;

    crosshairStateRef.current = nextCrosshair;
    setCrosshair(nextCrosshair);
    emitCrosshairCallbacks(event);
  }, [emitCrosshairCallbacks]);

  const scheduleCrosshairFlush = useCallback(() => {
    if (crosshairRafRef.current != null) return;
    crosshairRafRef.current = requestAnimationFrame(flushCrosshair);
  }, [flushCrosshair]);

  // Imperative handle (matches old ChartHandle + drawing selection APIs)
  useImperativeHandle(ref, () => ({
    startDrawing: (name: string) => {
      const next = armTool(drawingStateRef.current, name);
      syncDrawingState(next);
      setPreviewDrawing(null);
    },
    stopDrawing: () => {
      const next = disarmTool(drawingStateRef.current);
      syncDrawingState(next);
      setPreviewDrawing(null);
      notifySelectionChange(null);
    },
    clearDrawings: () => {
      const snapshot = drawingsRef.current.map((d) => ({
        ...d,
        points: d.points.map((p) => ({ ...p })),
        styles: d.styles ? { ...d.styles } : undefined,
      }));
      if (snapshot.length > 0) {
        drawingStoreRef.current.execute({
          type: 'batch',
          commands: snapshot.map((d) => ({
            type: 'remove' as const,
            id: d.id!,
            drawing: d,
          })),
        });
      } else {
        drawingStoreRef.current.setDrawings([], true);
      }
      trackedRef.current.clear();
      const next = disarmTool(drawingStateRef.current);
      syncDrawingState(next);
      setPreviewDrawing(null);
      notifySelectionChange(null);
    },
    setMagnet: (on: boolean) => {
      magnetEnabledRef.current = on;
    },
    getMagnetEnabled: () => magnetEnabledRef.current,
    setKeepDrawingMode: (on: boolean) => {
      keepDrawingRef.current = on;
    },
    getKeepDrawingMode: () => keepDrawingRef.current,
    zoomIn: () => {
      const priceHandle = paneHandlesRef.current.get('price');
      const el = chartAreaRef.current;
      if (!priceHandle || !el) return;
      const anchorX = el.clientWidth / 2;
      const vp = priceHandle.applyWheelAction({ type: 'zoom', factor: 1.25 }, anchorX);
      if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
    },
    lockAllDrawings: (locked: boolean) => {
      const commands = drawingsRef.current
        .filter((d) => d.id && d.locked !== locked)
        .map((d) => ({
          type: 'updateMeta' as const,
          id: d.id!,
          before: { locked: d.locked },
          after: { locked },
        }));
      if (commands.length === 0) return;
      drawingStoreRef.current.execute(
        commands.length === 1 ? commands[0] : { type: 'batch', commands }
      );
    },
    areAllDrawingsLocked: () => {
      const list = Array.from(trackedRef.current.values());
      return list.length > 0 && list.every((o) => o.locked);
    },
    setAllDrawingsVisible: (visible: boolean) => {
      const commands = drawingsRef.current
        .filter((d) => d.id && d.visible !== visible)
        .map((d) => ({
          type: 'updateMeta' as const,
          id: d.id!,
          before: { visible: d.visible },
          after: { visible },
        }));
      if (commands.length === 0) return;
      drawingStoreRef.current.execute(
        commands.length === 1 ? commands[0] : { type: 'batch', commands }
      );
    },
    areAllDrawingsHidden: () => {
      const list = Array.from(trackedRef.current.values());
      return list.length > 0 && list.every((o) => !o.visible);
    },
    getSelectedDrawingId: () => drawingStateRef.current.selectedId,
    selectDrawing: (id: string | null) => {
      const next = selectDrawingState(drawingStateRef.current, id);
      syncDrawingState(next);
      notifySelectionChange(id);
    },
    onSelectionChange: (cb) => {
      selectionChangeCbsRef.current.add(cb);
      return () => selectionChangeCbsRef.current.delete(cb);
    },
    serializeDrawings: () => serializeAll(drawingsRef.current),
    restoreDrawings: (data) => {
      hydrateDrawings(data);
    },
    resize: () => {
      const el = chartAreaRef.current;
      if (el) setDims({ width: el.clientWidth, height: el.clientHeight });
    },
    onCrosshair: (cb) => {
      crosshairCbsRef.current.add(cb);
      return () => crosshairCbsRef.current.delete(cb);
    },
    setCrosshairFromSync: applyCrosshairFromSync,
    getTrackedOverlays: () => Array.from(trackedRef.current.values()),
    removeOverlay: (id) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (d) {
        drawingStoreRef.current.execute({ type: 'remove', id, drawing: d });
      }
      trackedRef.current.delete(id);
      if (drawingStateRef.current.selectedId === id) {
        const next = selectDrawingState(drawingStateRef.current, null);
        syncDrawingState(next);
        notifySelectionChange(null);
      }
    },
    setOverlayVisible: (id, visible) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (!d || d.visible === visible) return;
      drawingStoreRef.current.execute({
        type: 'updateMeta',
        id,
        before: { visible: d.visible },
        after: { visible },
      });
    },
    setOverlayLocked: (id, locked) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (!d || d.locked === locked) return;
      drawingStoreRef.current.execute({
        type: 'updateMeta',
        id,
        before: { locked: d.locked },
        after: { locked },
      });
    },
    renameOverlay: (id, label) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (!d || d.label === label) return;
      drawingStoreRef.current.execute({
        type: 'updateMeta',
        id,
        before: { label: d.label },
        after: { label },
      });
    },
    duplicateOverlay: (id) => {
      const src = drawingsRef.current.find((d) => d.id === id);
      if (!src) return null;
      const maxZ = drawingsRef.current.reduce((m, d) => Math.max(m, d.zLevel), -1);
      const clone = cloneDrawingPayload(src, {
        newId: newDrawingId(),
        anchor: DUPLICATE_ANCHOR,
        zLevel: maxZ + 1,
        labelSuffix: ' copy',
      });
      addCommittedDrawing(clone);
      return clone.id ?? null;
    },
    pasteDrawings: (items, anchor) => {
      if (items.length === 0) return [];
      const maxZ = drawingsRef.current.reduce((m, d) => Math.max(m, d.zLevel), -1);
      const clones = cloneDrawingsForPaste(items, anchor, maxZ + 1, newDrawingId);
      drawingStoreRef.current.execute({
        type: 'batch',
        commands: clones.map((drawing) => ({ type: 'add' as const, drawing })),
      });
      for (const d of clones) {
        if (!d.id) continue;
        trackedRef.current.set(d.id, restoreAll([d])[0]);
      }
      return clones.map((d) => d.id!).filter(Boolean);
    },
    bringForward: (id) => {
      const previousOrder = [...drawingsRef.current]
        .sort((a, b) => a.zLevel - b.zLevel)
        .map((d) => d.id!)
        .filter(Boolean);
      const idx = previousOrder.indexOf(id);
      if (idx < 0 || idx >= previousOrder.length - 1) return;
      const order = [...previousOrder];
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      drawingStoreRef.current.execute({ type: 'reorderZ', order, previousOrder });
    },
    sendBackward: (id) => {
      const previousOrder = [...drawingsRef.current]
        .sort((a, b) => a.zLevel - b.zLevel)
        .map((d) => d.id!)
        .filter(Boolean);
      const idx = previousOrder.indexOf(id);
      if (idx <= 0) return;
      const order = [...previousOrder];
      [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
      drawingStoreRef.current.execute({ type: 'reorderZ', order, previousOrder });
    },
    subscribeOverlayChange: (cb) => {
      overlayChangeCbsRef.current.add(cb);
      return () => overlayChangeCbsRef.current.delete(cb);
    },
    getSubPaneId: (key) => key,
    applyPaneHeights: (heights) => {},
    resetChartView: () => {
      const priceHandle = paneHandlesRef.current.get('price');
      if (!priceHandle) return;
      const vp = priceHandle.resetViewport();
      if (vp) {
        paneHandlesRef.current.forEach((handle, id) => {
          if (id !== 'price') handle.syncTimeWindow(vp.startIndex, vp.endIndex, true);
        });
      }
      paneHandlesRef.current.forEach((handle, id) => {
        if (id !== 'price') handle.resetViewport();
      });
    },
    resetPriceScaleWindow: (settingsOverride?: ChartSettings) => {
      const priceHandle = paneHandlesRef.current.get('price');
      if (!priceHandle?.resetPriceScale) return;
      const merged = settingsOverride ?? mergeChartSettings(config.chartSettings);
      const vp = priceHandle.resetPriceScale(merged);
      if (vp) {
        paneHandlesRef.current.forEach((handle, id) => {
          if (id !== 'price') handle.syncTimeWindow(vp.startIndex, vp.endIndex, true);
        });
      }
      paneHandlesRef.current.forEach((handle, id) => {
        if (id !== 'price') handle.resetPriceScale?.(merged);
      });
    },
    isViewportModified: () => {
      for (const handle of paneHandlesRef.current.values()) {
        if (handle.isViewportModified()) return true;
      }
      return false;
    },
    updateDrawingStyles: (id, patch) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (!d) return;
      const before = d.styles ? { ...d.styles } : {};
      const after = { ...before, ...patch };
      drawingStoreRef.current.execute({
        type: 'updateMeta',
        id,
        before: { styles: before },
        after: { styles: after },
      });
    },
    updateDrawingMetadata: (id, patch) => {
      const d = drawingsRef.current.find((x) => x.id === id);
      if (!d) return;
      const before = d.metadata ? { ...d.metadata } : undefined;
      const after = mergeMetadata(d.metadata, patch);
      drawingStoreRef.current.execute({
        type: 'updateMeta',
        id,
        before: { metadata: before },
        after: { metadata: after },
      });
    },
    undo: () => drawingStoreRef.current.undo(),
    redo: () => drawingStoreRef.current.redo(),
    canUndo: () => drawingStoreRef.current.canUndo(),
    canRedo: () => drawingStoreRef.current.canRedo(),
    getRawCandleCount: () => baseCandlesRef.current.length,
    getCandles: () => candlesRef.current,
    goTo: (req) => goToImplRef.current(req),
    getLastCandleTimestamp: () => {
      const base = baseCandlesRef.current;
      return base.length > 0 ? base[base.length - 1]!.t : null;
    },
    getDrawingScreenBounds: (id: string) => {
      const drawing = drawingsRef.current.find((d) => d.id === id);
      if (!drawing?.id) return null;
      const paneId = drawing.paneId ?? 'price';
      const vp =
        paneHandlesRef.current.get(paneId)?.getViewport() ??
        (paneId === 'price' ? latestVpRef.current : null);
      if (!vp || candlesRef.current.length === 0) return null;
      const plugin = getPluginForTool(drawing.name);
      if (!plugin?.getControlPoints) return null;
      const segment = paneSegmentsRef.current.find((s) => s.paneId === paneId);
      if (!segment) return null;
      const showTimeAxis = segment.showTimeAxis ?? true;
      const cps = plugin.getControlPoints(drawing, vp, candlesRef.current, showTimeAxis);
      if (cps.length === 0) return null;
      const settings = mergeChartSettings(configRef.current.chartSettings);
      const plotOffset = paneId === 'price' ? plotLeftOffset(resolvePriceScaleSide(settings.scales.priceScalePlacement)) : 0;
      const xs = cps.map((p) => p.x + plotOffset);
      const ys = cps.map((p) => p.y + segment.top);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      };
    },
  }), [notifyOverlayChange, applyCrosshairFromSync, syncDrawingState, notifySelectionChange, addCommittedDrawing, hydrateDrawings]);

  useEffect(() => {
    userPannedTimeAxisRef.current = false;
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, [candleSessionKey]);

  const markUserTimePan = useCallback(() => {
    userPannedTimeAxisRef.current = true;
  }, []);

  // Data fetch — range + interval from config; bottom-bar presets set both together.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const generation = ++fetchGenerationRef.current;
    const sessionKey = buildCandleSessionKey(config.symbol, config.range, config.interval);
    fetchStateRef.current.hasMoreHistory = true;
    fetchStateRef.current.abortController?.abort();
    fetchStateRef.current.abortController = null;
    fetchStateRef.current.inFlight = false;
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    const isInitialLoad = baseCandlesRef.current.length === 0;
    if (isInitialLoad) setLoading(true);
    setError(null);
    (async () => {
      try {
        const raw = await fetchYahooCandles(
          config.symbol,
          config.range,
          config.interval,
          controller.signal,
        );
        if (cancelled) return;
        if (generation !== fetchGenerationRef.current) return;
        baseCandlesRef.current = raw;
        setBaseCandles(raw);
        setLoadedSessionKey(sessionKey);
        setDisplayInterval(config.interval);
        onDataLoadedRef.current?.({ count: raw.length });
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [config.symbol, config.range, config.interval]);

  // Keep refs in sync with derived display series.
  useLayoutEffect(() => {
    candlesRef.current = displayCandles;
    onCandlesChangeRef.current?.(displayCandles);
  }, [displayCandles]);

  // Resize observer for real dimensions
  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ width: Math.max(100, width), height: Math.max(100, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Restore drawings after data load
  useEffect(() => {
    if (loading || error || displayCandles.length === 0) return;
    if (trackedRef.current.size > 0) return;
    if (!config.drawings?.length) return;
    hydrateDrawings(config.drawings);
  }, [loading, error, displayCandles.length, config.drawings, hydrateDrawings]);

  useEffect(() => {
    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
      }
    };
  }, []);

  const handleCrosshairMove = useCallback(
    (event: CrosshairMoveEvent | null) => {
      pendingCrosshairRef.current = event ? { kind: 'move', event } : { kind: 'clear' };
      scheduleCrosshairFlush();
    },
    [scheduleCrosshairFlush],
  );

  const syncSiblings = useCallback((startIndex: number, endIndex: number, sourcePaneId: string) => {
    paneHandlesRef.current.forEach((handle, id) => {
      if (id !== sourcePaneId) handle.syncTimeWindow(startIndex, endIndex);
    });
  }, []);

  useLayoutEffect(() => {
    const pending = pendingGoToNavigationRef.current;
    if (!pending || displayCandles.length === 0) return;
    const priceHandle = paneHandlesRef.current.get('price');
    if (!priceHandle) return;
    pendingGoToNavigationRef.current = null;
    userPannedTimeAxisRef.current = true;
    const navigated = priceHandle.navigateToViewport(pending.startIndex, pending.endIndex);
    if (navigated) {
      syncSiblings(navigated.startIndex, navigated.endIndex, 'price');
    }
  }, [displayCandles, syncSiblings]);

  const applyPrependedCandles = useCallback(
    (merged: Candle[], added: number) => {
      const priceHandle = paneHandlesRef.current.get('price');
      const vp = priceHandle?.getViewport();
      if (vp && added > 0) {
        const shifted = adjustViewportForPrepend(vp, added);
        priceHandle?.syncTimeWindow(shifted.startIndex, shifted.endIndex, true);
        syncSiblings(shifted.startIndex, shifted.endIndex, 'price');
      }
      baseCandlesRef.current = merged;
      setBaseCandles(merged);
      onDataLoadedRef.current?.({ count: merged.length });
    },
    [syncSiblings],
  );

  goToImplRef.current = async (req: GoToRequest): Promise<GoToResult> => {
    if (visibleCount != null && visibleCount > 0) {
      return { ok: false, reason: 'replay_active' };
    }

    let candles = baseCandlesRef.current;
    if (candles.length === 0) {
      return { ok: false, reason: 'no_data' };
    }

    const priceHandle = paneHandlesRef.current.get('price');
    const currentVp = priceHandle?.getViewport();
    if (!priceHandle || !currentVp) {
      return { ok: false, reason: 'no_data' };
    }

    const visibleSpan = Math.max(1, currentVp.endIndex - currentVp.startIndex);
    const minLeadingBars = Math.ceil(visibleSpan);

    const cfg = configRef.current;
    const fetchOlder = (beforeMs: number) =>
      fetchOlderCandles(cfg.symbol, cfg.interval, beforeMs);
    const ensureCover = async (targetMs: number) => {
      try {
        return await ensureCandlesCover(candles, targetMs, fetchOlder, 20, minLeadingBars);
      } catch {
        return null;
      }
    };

    if (req.mode === 'range') {
      if (!Number.isFinite(req.from) || !Number.isFinite(req.to)) {
        return { ok: false, reason: 'invalid_date' };
      }
      if (req.from > req.to) {
        return { ok: false, reason: 'invalid_range' };
      }
      const cover = await ensureCover(req.from);
      if (!cover) {
        return { ok: false, reason: 'out_of_range' };
      }
      candles = cover.candles;
      if (!cover.covered) {
        return { ok: false, reason: 'out_of_range' };
      }
      if (cover.prepended > 0) {
        baseCandlesRef.current = candles;
        setBaseCandles(candles);
        onDataLoadedRef.current?.({ count: candles.length });
      }
      const lastTs = candles[candles.length - 1]!.t;
      if (req.from > lastTs) {
        return { ok: false, reason: 'out_of_range' };
      }
    } else {
      if (!Number.isFinite(req.at)) {
        return { ok: false, reason: 'invalid_date' };
      }
      const lastTs = candles[candles.length - 1]!.t;
      const targetMs = Math.min(req.at, lastTs);
      const cover = await ensureCover(targetMs);
      if (!cover) {
        return { ok: false, reason: 'out_of_range' };
      }
      candles = cover.candles;
      if (!cover.covered) {
        return { ok: false, reason: 'out_of_range' };
      }
      if (cover.prepended > 0) {
        baseCandlesRef.current = candles;
        setBaseCandles(candles);
        onDataLoadedRef.current?.({ count: candles.length });
      }
    }

    let nextVp;
    if (req.mode === 'range') {
      const lastTs = candles[candles.length - 1]!.t;
      nextVp = goToRange(currentVp, candles, req.from, Math.min(req.to, lastTs));
    } else {
      const lastTs = candles[candles.length - 1]!.t;
      nextVp = goToDate(currentVp, candles, Math.min(req.at, lastTs));
    }

    if (candles !== baseCandlesRef.current) {
      baseCandlesRef.current = candles;
      setBaseCandles(candles);
      onDataLoadedRef.current?.({ count: candles.length });
    }

    if (candles.length !== displayCandles.length) {
      pendingGoToNavigationRef.current = {
        startIndex: nextVp.startIndex,
        endIndex: nextVp.endIndex,
      };
    } else {
      const navigated = priceHandle.navigateToViewport(nextVp.startIndex, nextVp.endIndex);
      if (navigated) {
        syncSiblings(navigated.startIndex, navigated.endIndex, 'price');
      }
    }

    userPannedTimeAxisRef.current = true;

    if (cfg.rangePreset != null) {
      onConfigChange?.({ ...cfg, rangePreset: null });
    }

    return { ok: true };
  };

  const runEdgeFetch = useCallback(async () => {
    const base = baseCandlesRef.current;
    if (base.length === 0 || fetchStateRef.current.inFlight || !fetchStateRef.current.hasMoreHistory) {
      return;
    }
    const firstTs = base[0].t;
    fetchStateRef.current.inFlight = true;
    const controller = new AbortController();
    fetchStateRef.current.abortController = controller;
    try {
      const older = await fetchOlderCandles(
        config.symbol,
        config.interval,
        firstTs,
        undefined,
        controller.signal,
      );
      if (older.length === 0) {
        fetchStateRef.current.hasMoreHistory = false;
        return;
      }
      const merged = mergeCandlesPrepend(base, older);
      const added = merged.length - base.length;
      if (added <= 0) {
        fetchStateRef.current.hasMoreHistory = false;
        return;
      }
      const priceHandle = paneHandlesRef.current.get('price');
      const vp = priceHandle?.getViewport();
      if (vp) {
        const shifted = adjustViewportForPrepend(vp, added);
        priceHandle?.syncTimeWindow(shifted.startIndex, shifted.endIndex, true);
        syncSiblings(shifted.startIndex, shifted.endIndex, 'price');
      }
      baseCandlesRef.current = merged;
      setBaseCandles(merged);
      onDataLoadedRef.current?.({ count: merged.length });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      fetchStateRef.current.hasMoreHistory = false;
    } finally {
      fetchStateRef.current.inFlight = false;
      fetchStateRef.current.abortController = null;
    }
  }, [config.symbol, config.interval, syncSiblings]);

  const registerPane: RegisterPane = useCallback((handle) => {
    paneHandlesRef.current.set(handle.paneId, handle);
    return () => paneHandlesRef.current.delete(handle.paneId);
  }, []);

  const handleViewport = useCallback((vp: VisibleRange, paneId: string) => {
    if (paneId === 'price') latestVpRef.current = vp;
    syncSiblings(vp.startIndex, vp.endIndex, paneId);

    if (
      paneId !== 'price' ||
      !userPannedTimeAxisRef.current ||
      !shouldPrefetchEdge(vp.startIndex)
    ) {
      return;
    }
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      void runEdgeFetch();
    }, 150);
  }, [syncSiblings, runEdgeFetch]);

  const flushWheel = useCallback(() => {
    wheelRafRef.current = null;
    const batch = pendingWheelRef.current;
    pendingWheelRef.current = null;
    if (!batch) return;

    const priceHandle = paneHandlesRef.current.get('price');
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

    if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
  }, [syncSiblings]);

  // Single non-passive wheel listener on the chart container — one authority, rAF-batched.
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
  }, [flushWheel]);

  const drawingFsmRef = useRef(drawingFsm);
  drawingFsmRef.current = drawingFsm;

  const applyPinchZoom = useCallback(
    (factor: number, anchorX: number) => {
      const priceHandle = paneHandlesRef.current.get('price');
      if (!priceHandle) return;
      const vp = priceHandle.applyWheelAction({ type: 'zoom', factor }, anchorX);
      if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
    },
    [syncSiblings],
  );

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
  }, [applyPinchZoom]);

  const getPaneShowTimeAxis = useCallback((paneId: string) => {
    const segment = paneSegmentsRef.current.find((s) => s.paneId === paneId);
    return segment?.showTimeAxis ?? true;
  }, []);

  const getPaneIndicators = useCallback((paneId: string) => {
    const indicators = configRef.current.indicators.filter((i) => i.visible !== false);
    if (paneId === 'price') return indicators.filter((i) => i.pane === 'main');
    return indicators.filter((i) => indicatorKey(i) === paneId);
  }, []);

  const stampPaneId = useCallback(
    (draft: SerializedDrawing, paneId: string) => ({ ...draft, paneId }),
    []
  );

  const placingAnchorRef = useRef<{ plotX: number; plotY: number } | null>(null);

  const handleDrawingPointer = useCallback(
    (event: DrawingPointerEvent) => {
      const paneId = event.paneId ?? 'price';
      activePlacingPaneRef.current = paneId;
      const vp =
        paneHandlesRef.current.get(paneId)?.getViewport() ??
        (paneId === 'price' ? latestVpRef.current : null);
      if (!vp || candlesRef.current.length === 0) return false;
      const showTimeAxis = getPaneShowTimeAxis(paneId);
      const paneIndicators = getPaneIndicators(paneId);
      const plotOpts = {
        magnet: magnetEnabledRef.current,
        showTimeAxis,
        paneId,
        indicators: paneIndicators,
      };
      let point: ReturnType<typeof plotToPoint> | null = null;
      const getPoint = () => {
        point ??= plotToPoint(event.plotX, event.plotY, vp, candlesRef.current, plotOpts);
        return point;
      };
      const translateSnapshotPoints = (points: SerializedDrawing['points']) => {
        const start = drawingDragStartRef.current;
        if (!start) return points.map((p) => ({ ...p }));
        return translateDrawingPoints(
          points,
          { x: start.plotX, y: start.plotY },
          { x: event.plotX, y: event.plotY },
          vp,
          candlesRef.current,
          plotOpts
        );
      };
      const paneDrawings = drawingsRef.current.filter((d) => (d.paneId ?? 'price') === paneId);
      let state = drawingStateRef.current;

      if (state.fsm === 'dragging_drawing' && event.phase === 'move' && state.draggingDrawingId != null) {
        const drawing = paneDrawings.find((d) => d.id === state.draggingDrawingId);
        const before = cpDragPointsSnapshotRef.current;
        if (drawing && before && !drawing.locked) {
          drawingStoreRef.current.replaceDrawing(drawing.id!, {
            ...drawing,
            points: translateSnapshotPoints(before),
          });
        }
        return true;
      }

      if (state.fsm === 'dragging_cp' && event.phase === 'move' && state.draggingDrawingId != null) {
        const drawing = paneDrawings.find((d) => d.id === state.draggingDrawingId);
        const plugin = drawing ? getPluginForTool(drawing.name) : undefined;
        if (drawing && plugin?.updateFromControl && !drawing.locked) {
          const pt = getPoint();
          const updated = plugin.updateFromControl(
            drawing,
            state.draggingCpIndex,
            event.plotX,
            event.plotY,
            vp,
            candlesRef.current,
            showTimeAxis
          );
          updated.points[state.draggingCpIndex] = {
            ...updated.points[state.draggingCpIndex],
            timestamp: pt.timestamp,
            value: pt.value,
            dataIndex: pt.dataIndex,
          };
          drawingStoreRef.current.replaceDrawing(drawing.id!, updated);
        }
        return true;
      }

      if (event.phase === 'down') {
        if (state.fsm === 'selected' && state.selectedId) {
          const drawing = paneDrawings.find((d) => d.id === state.selectedId);
          if (drawing && !drawing.locked) {
            const cpIdx = hitTestControlPoint(
              event.plotX,
              event.plotY,
              drawing,
              vp,
              candlesRef.current,
              showTimeAxis
            );
            if (cpIdx >= 0) {
              cpDragPointsSnapshotRef.current = drawing.points.map((p) => ({ ...p }));
              state = startDraggingCp(state, state.selectedId, cpIdx);
              syncDrawingState(state);
              return true;
            }
          }
        }

        const hitId =
          state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed'
            ? hitTestAll(
                event.plotX,
                event.plotY,
                paneDrawings,
                vp,
                candlesRef.current,
                showTimeAxis
              )
            : null;

        if (hitId && (state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed')) {
          const drawing = paneDrawings.find((d) => d.id === hitId);
          if (drawing && !drawing.locked) {
            cpDragPointsSnapshotRef.current = drawing.points.map((p) => ({ ...p }));
            drawingDragStartRef.current = { plotX: event.plotX, plotY: event.plotY };
            state = startDraggingDrawing(state, hitId);
          } else {
            state = selectDrawingState(state, hitId);
          }
          syncDrawingState(state);
          notifySelectionChange(hitId);
          return true;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          if (!plugin) return true;

          // Variable-N stub: double-click finishes when isPlacementComplete (future polylines).
          if (isDoubleClickFinish(event) && supportsDoubleClickFinish(plugin)) {
            const result = finishPlacingIfComplete(
              state,
              plugin,
              state.placingDraft,
              drawingsRef.current,
              { vp, candles: candlesRef.current }
            );
            if (result) {
              addCommittedDrawing(result.drawing);
              syncDrawingState(finishAfterCommit(result.state));
              setPreviewDrawing(null);
              placingAnchorRef.current = null;
            }
            return true;
          }

          let draft = state.placingDraft;
          if (plugin.updatePreview) {
            draft = plugin.updatePreview(draft, getPoint(), vp, candlesRef.current);
          }
          const committed = finishPlacingIfComplete(
            state,
            plugin,
            draft,
            drawingsRef.current,
            { vp, candles: candlesRef.current }
          );
          if (committed) {
            addCommittedDrawing(committed.drawing);
            syncDrawingState(finishAfterCommit(committed.state));
            setPreviewDrawing(null);
            placingAnchorRef.current = null;
            return true;
          }
          state = advancePlacing(state, draft);
          syncDrawingState(state);
          setPreviewDrawing(draft);
          placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
          return true;
        }

        if (state.fsm === 'selected') {
          state = selectDrawingState(state, null);
          syncDrawingState(state);
          notifySelectionChange(null);
        }

        if (state.fsm === 'tool_armed' && state.activeTool) {
          const tool = state.activeTool;
          if (isOnePointTool(tool)) {
            const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
            if (!draft) return true;
            const plugin = getPluginForTool(tool);
            const finalized = plugin?.finalize
              ? plugin.finalize(draft, vp, candlesRef.current)
              : draft;
            const { state: nextState, drawing } = commitDrawing(
              state,
              finalized,
              drawingsRef.current
            );
            addCommittedDrawing(drawing);
            syncDrawingState(finishAfterCommit(nextState));
            return true;
          }
          if (isTwoPointTool(tool) || isMultiPointTool(tool)) {
            const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
            if (!draft) return true;
            const paneDraft = stampPaneId(draft, paneId);
            state = startPlacing(state, paneDraft);
            syncDrawingState(state);
            setPreviewDrawing(paneDraft);
            placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
            return true;
          }
        }
      }

      if (event.phase === 'move') {
        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          const updated =
            plugin?.updatePreview?.(state.placingDraft, getPoint(), vp, candlesRef.current) ??
            state.placingDraft;
          drawingStateRef.current = { ...state, placingDraft: updated };
          setPreviewDrawing(updated);
        }
        return state.fsm === 'placing' || state.fsm === 'dragging_cp' || state.fsm === 'dragging_drawing';
      }

      if (event.phase === 'up') {
        if (state.fsm === 'dragging_drawing') {
          const id = state.draggingDrawingId;
          const drawing = id ? drawingsRef.current.find((d) => d.id === id) : undefined;
          const before = cpDragPointsSnapshotRef.current;
          cpDragPointsSnapshotRef.current = null;
          drawingDragStartRef.current = null;
          if (drawing && before && id && !pointsEqual(before, drawing.points)) {
            drawingStoreRef.current.execute({
              type: 'updatePoints',
              id,
              before,
              after: drawing.points.map((p) => ({ ...p })),
            });
          }
          state = stopDraggingDrawing(state);
          syncDrawingState(state);
          return true;
        }

        if (state.fsm === 'dragging_cp') {
          const id = state.draggingDrawingId;
          const drawing = id ? drawingsRef.current.find((d) => d.id === id) : undefined;
          const before = cpDragPointsSnapshotRef.current;
          cpDragPointsSnapshotRef.current = null;
          drawingDragStartRef.current = null;
          if (drawing && before && id && !pointsEqual(before, drawing.points)) {
            drawingStoreRef.current.execute({
              type: 'updatePoints',
              id,
              before,
              after: drawing.points.map((p) => ({ ...p })),
            });
          }
          state = stopDraggingCp(state);
          syncDrawingState(state);
          return true;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const anchor = placingAnchorRef.current;
          const moved =
            anchor &&
            Math.hypot(event.plotX - anchor.plotX, event.plotY - anchor.plotY) > 5;
          if (moved) {
            const plugin = getPluginForTool(state.activeTool);
            if (!plugin) return true;
            let draft = state.placingDraft;
            if (plugin.updatePreview) {
              draft = plugin.updatePreview(draft, getPoint(), vp, candlesRef.current);
            }
            const committed = finishPlacingIfComplete(
              state,
              plugin,
              draft,
              drawingsRef.current,
              { vp, candles: candlesRef.current }
            );
            if (committed) {
              addCommittedDrawing(committed.drawing);
              syncDrawingState(finishAfterCommit(committed.state));
              setPreviewDrawing(null);
              placingAnchorRef.current = null;
            }
          }
        }
      }
      return false;
    },
    [
      getPaneShowTimeAxis,
      getPaneIndicators,
      stampPaneId,
      finishAfterCommit,
      syncDrawingState,
      notifySelectionChange,
      addCommittedDrawing,
    ]
  );

  const handleDrawingContextMenu = useCallback(
    (event: DrawingPointerEvent & { clientX: number; clientY: number }): boolean => {
      const paneId = event.paneId ?? 'price';
      const vp =
        paneHandlesRef.current.get(paneId)?.getViewport() ??
        (paneId === 'price' ? latestVpRef.current : null);
      if (!vp || candlesRef.current.length === 0) return false;
      const showTimeAxis = getPaneShowTimeAxis(paneId);
      const paneDrawings = drawingsRef.current.filter((d) => (d.paneId ?? 'price') === paneId);
      const hitId = hitTestAll(
        event.plotX,
        event.plotY,
        paneDrawings,
        vp,
        candlesRef.current,
        showTimeAxis
      );
      if (!hitId) return false;
      const meta = trackedRef.current.get(hitId);
      if (meta && onOverlayRightClickRef.current) {
        const next = selectDrawingState(drawingStateRef.current, hitId);
        syncDrawingState(next);
        notifySelectionChange(hitId);
        onOverlayRightClickRef.current(meta, { x: event.clientX, y: event.clientY });
        return true;
      }
      return false;
    },
    [getPaneShowTimeAxis, syncDrawingState, notifySelectionChange]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const state = drawingStateRef.current;
      if (state.fsm === 'placing') {
        const next = cancelPlacing(state);
        syncDrawingState(next);
        setPreviewDrawing(null);
        placingAnchorRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [syncDrawingState]);

  // Compute pane layout for price + visible sub indicators
  const visibleIndicators = useMemo(
    () => config.indicators.filter((i) => i.visible !== false),
    [config.indicators],
  );
  const subKeys = visibleIndicators.filter((i) => i.pane === 'sub').map(indicatorKey);
  const effectivePaneHeights = dragHeights ?? config.paneHeights;
  const layout: PaneLayout = createInitialLayout(
    subKeys,
    dims.height || 400,
    collapsedKeys ?? new Set(),
    maximizedKey ?? null,
    effectivePaneHeights,
    paneOrder
  );
  layoutRef.current = layout;

  const paneSegments: PaneSegment[] = layout.stack.map((pane, i) => ({
    paneId: pane.key === PRICE_PANE_KEY ? 'price' : pane.key,
    top: pane.top,
    height: pane.height,
    showTimeAxis: i === layout.stack.length - 1,
  }));
  paneSegmentsRef.current = paneSegments;

  const paneBoundaries = computePaneBoundaries(layout);

  const handleSeparatorResize = useCallback(
    (boundaryIndex: number, deltaY: number) => {
      const base = dragHeightsRef.current ?? config.paneHeights ?? {};
      const next = applyBoundaryResize(
        subKeys,
        base,
        boundaryIndex,
        deltaY,
        dims.height || 400,
        collapsedKeys ?? new Set(),
        maximizedKey ?? null,
        paneOrder
      );
      if (next) {
        dragHeightsRef.current = next;
        setDragHeights(next);
      }
    },
    [subKeys, config.paneHeights, dims.height, collapsedKeys, maximizedKey, paneOrder]
  );

  const handleSeparatorResizeEnd = useCallback(() => {
    const finalHeights = dragHeightsRef.current;
    dragHeightsRef.current = null;
    setDragHeights(null);
    if (finalHeights && onPaneHeightsChange) {
      onPaneHeightsChange(finalHeights);
    }
  }, [onPaneHeightsChange]);

  const hasMultiplePanes = layout.stack.length > 1;

  const mainIndicators = useMemo(
    () => visibleIndicators.filter((i) => i.pane === 'main'),
    [visibleIndicators],
  );

  const buildIndicatorLegendSections = useCallback(
    (ind: IndicatorConfig) => {
      const sections = resolveIndicatorLegend(
        ind,
        displayCandles,
        crosshair?.dataIndex ?? null,
        theme,
        config.chartSettings,
      );
      if (!sections) return null;
      if (indicatorHasSettings(ind.name)) {
        return appendLegendSettingsAction(sections, ind.id);
      }
      return sections;
    },
    [displayCandles, crosshair?.dataIndex, theme, config.chartSettings],
  );

  const handleLegendAction = useCallback((actionId: string) => {
    onLegendActionRef.current?.(actionId);
  }, []);

  const paneDrawingsMap = useMemo(() => {
    const map = new Map<string, SerializedDrawing[]>();
    for (const d of drawingsRef.current) {
      const pid = d.paneId ?? 'price';
      const list = map.get(pid) ?? [];
      list.push(d);
      map.set(pid, list);
    }
    return map;
  }, [drawTick]);

  const previewForPane = useCallback(
    (paneKey: string) => {
      if (!previewDrawing) return null;
      const pid = previewDrawing.paneId ?? activePlacingPaneRef.current;
      const key = paneKey === PRICE_PANE_KEY ? 'price' : paneKey;
      return pid === key ? previewDrawing : null;
    },
    [previewDrawing]
  );

  const selectedIdForPane = useCallback(
    (paneKey: string) => {
      if (!selectedDrawingId) return null;
      const pid = paneKey === PRICE_PANE_KEY ? 'price' : paneKey;
      const drawing = drawingsRef.current.find((d) => d.id === selectedDrawingId);
      if (!drawing) return null;
      return (drawing.paneId ?? 'price') === pid ? selectedDrawingId : null;
    },
    [selectedDrawingId, drawTick],
  );
  const activeTool = activeDrawingTool ?? '__cursor__';
  const drawingMode = drawingModeFromState(drawingFsm);
  const hideCrosshair = shouldHideCrosshair(drawingFsm);
  const chartSettings = useMemo(
    () => mergeChartSettings(config.chartSettings),
    [config.chartSettings],
  );
  const showCrosshairOverlay = chartSettings.canvas.showCrosshair && !hideCrosshair;

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onChartContextMenu?.({ x: e.clientX, y: e.clientY });
    },
    [onChartContextMenu],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div
        ref={chartAreaRef}
        data-edge-chart
        className="relative flex min-h-0 w-full flex-1 flex-col"
        style={{ touchAction: 'none' }}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {
          if (!wheelingRef.current) handleCrosshairMove(null);
        }}
      >
      {(error || (loading && displayCandles.length === 0)) && (
        <div className="absolute left-2 top-2 z-10 text-xs text-gray-500">
          {error ?? 'Loading…'}
        </div>
      )}

      {layout.stack.map((pane, i) => {
        const isLast = i === layout.stack.length - 1;
        const showTimeAxis = isLast;
        const isPrice = pane.key === PRICE_PANE_KEY;

        if (isPrice) {
          return (
            <Fragment key={pane.key}>
              {i > 0 && (
                <div
                  aria-hidden
                  style={{ height: PANE_SEPARATOR_HEIGHT, flexShrink: 0 }}
                />
              )}
              <div
                className={`group relative${
                  pane.isCollapsed
                    ? ' border-y border-[#1E2030] bg-[#12131A] dark:border-[#1E2030] dark:bg-[#12131A]'
                    : ''
                }`}
                style={{ height: pane.height, flexShrink: 0 }}
              >
                {!error && (hasMultiplePanes || pane.isCollapsed) && (
                  <PaneControlBar
                    paneKey={PRICE_PANE_KEY}
                    theme={theme}
                    stackIndex={i}
                    stackLength={layout.stack.length}
                    isCollapsed={pane.isCollapsed}
                    isMaximized={pane.isMaximized}
                    isPricePane
                    onMoveUp={() => onMoveIndicatorUp?.(PRICE_PANE_KEY)}
                    onMoveDown={() => onMoveIndicatorDown?.(PRICE_PANE_KEY)}
                    onCollapse={() => onCollapseIndicator?.(PRICE_PANE_KEY)}
                    onMaximize={() => onMaximizeIndicator?.(PRICE_PANE_KEY)}
                  />
                )}
                {!error && displayCandles.length > 0 && (
                  <>
                    <ChartLegendBar
                      symbol={config.symbol}
                      symbolName={config.symbolName}
                      exchange={config.exchange}
                      interval={displayInterval}
                      candles={displayCandles}
                      dataIndex={crosshair?.dataIndex ?? null}
                      theme={theme}
                      chartSettings={chartSettings}
                      compact={pane.isCollapsed}
                    />
                    {!pane.isCollapsed &&
                      mainIndicators.map((ind, idx) => {
                        const sections = buildIndicatorLegendSections(ind);
                        if (!sections) return null;
                        return (
                          <PaneLegendBar
                            key={ind.id}
                            sections={sections}
                            theme={theme}
                            onAction={handleLegendAction}
                            style={{ top: `${28 + idx * 22}px` }}
                          />
                        );
                      })}
                  </>
                )}
                {!pane.isCollapsed && (
                  <ChartCanvas
                    key="price"
                    paneId="price"
                    candles={displayCandles}
                    chartType={config.chartType}
                    theme={theme}
                    visibleCount={visibleCount}
                    width={dims.width}
                    height={pane.height}
                    drawings={paneDrawingsMap.get('price') ?? []}
                    previewDrawing={previewForPane(PRICE_PANE_KEY)}
                    selectedDrawingId={selectedDrawingId}
                    drawingMode={drawingMode}
                    indicators={mainIndicators}
                    registerPane={registerPane}
                    wheelingRef={wheelingRef}
                    interval={displayInterval}
                    showTimeAxis={showTimeAxis}
                    activeTool={activeTool}
                    suppressCrosshair={hideCrosshair}
                    chartSettings={chartSettings}
                    onDrawingPointer={handleDrawingPointer}
                    onDrawingContextMenu={handleDrawingContextMenu}
                    onPriceScaleContextMenu={onPriceScaleContextMenu}
                    onCrosshairMove={handleCrosshairMove}
                    onViewportChange={handleViewport}
                    range={config.range}
                    rangePreset={config.rangePreset ?? null}
                    viewportRevision={viewportRevision}
                    onUserTimePan={markUserTimePan}
                  />
                )}
              </div>
            </Fragment>
          );
        }

        const subInd = visibleIndicators.find((ind) => indicatorKey(ind) === pane.key);
        if (!subInd) return null;

        return (
          <Fragment key={pane.key}>
            {i > 0 && (
              <div
                aria-hidden
                style={{ height: PANE_SEPARATOR_HEIGHT, flexShrink: 0 }}
              />
            )}
            <div
              className={`group relative${
                pane.isCollapsed
                  ? ' border-y border-[#1E2030] bg-[#12131A] dark:border-[#1E2030] dark:bg-[#12131A]'
                  : ''
              }`}
              style={{ height: pane.height, flexShrink: 0 }}
            >
              {!error && (hasMultiplePanes || pane.isCollapsed) && (
                <PaneControlBar
                  paneKey={pane.key}
                  theme={theme}
                  stackIndex={i}
                  stackLength={layout.stack.length}
                  isCollapsed={pane.isCollapsed}
                  isMaximized={pane.isMaximized}
                  isPricePane={false}
                  onMoveUp={() => onMoveIndicatorUp?.(pane.key)}
                  onMoveDown={() => onMoveIndicatorDown?.(pane.key)}
                  onRemove={() => onRemoveIndicator?.(subInd.id)}
                  onCollapse={() => onCollapseIndicator?.(pane.key)}
                  onMaximize={() => onMaximizeIndicator?.(pane.key)}
                />
              )}
              {!error && displayCandles.length > 0 && (() => {
                const sections = buildIndicatorLegendSections(subInd);
                return sections ? (
                  <PaneLegendBar
                    sections={sections}
                    theme={theme}
                    onAction={handleLegendAction}
                    compact={pane.isCollapsed}
                  />
                ) : null;
              })()}
              {!pane.isCollapsed && (
                <ChartCanvas
                  key={pane.key}
                  paneId={pane.key}
                  candles={displayCandles}
                  chartType={config.chartType}
                  theme={theme}
                  visibleCount={visibleCount}
                  width={dims.width}
                  height={pane.height}
                  drawings={paneDrawingsMap.get(pane.key) ?? []}
                  previewDrawing={previewForPane(pane.key)}
                  selectedDrawingId={selectedDrawingId}
                  drawingMode={drawingMode}
                  suppressCrosshair={hideCrosshair}
                  chartSettings={chartSettings}
                  onDrawingPointer={handleDrawingPointer}
                  onDrawingContextMenu={handleDrawingContextMenu}
                  indicators={[subInd]}
                  registerPane={registerPane}
                  wheelingRef={wheelingRef}
                  interval={displayInterval}
                  showTimeAxis={showTimeAxis}
                  activeTool={activeTool}
                  onCrosshairMove={handleCrosshairMove}
                  onViewportChange={handleViewport}
                />
              )}
            </div>
          </Fragment>
        );
      })}

      <CrosshairOverlay
        width={dims.width}
        height={dims.height}
        theme={theme}
        crosshair={showCrosshairOverlay ? crosshair : null}
        crosshairMode={chartSettings.canvas.crosshairMode}
        canvasSettings={chartSettings.canvas}
      />

      {hasMultiplePanes && (
        <PaneSeparators
          boundaries={paneBoundaries}
          width={dims.width}
          theme={theme}
          onResize={handleSeparatorResize}
          onResizeEnd={handleSeparatorResizeEnd}
        />
      )}
      </div>
    </div>
  );
});

export default EdgeChart;
