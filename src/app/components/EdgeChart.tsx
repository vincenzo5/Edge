'use client';

import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
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
import type { VisibleRange, CrosshairMoveEvent, CrosshairState, PaneSegment } from '@/lib/chart/contracts';
import type { ChartPaneHandle, RegisterPane } from '@/lib/chart/paneHandle';
import { PRICE_PANE_KEY } from '@/lib/chartConfig';
import ChartCanvas from '@/lib/chart/canvas';
import CrosshairOverlay from '@/lib/chart/CrosshairOverlay';
import ChartLegendBar from './ChartLegendBar';
import PaneLegendBar from './PaneLegendBar';
import { resolveIndicatorLegend, appendLegendSettingsAction } from '@/lib/chart/legend';
import { IndicatorRegistry } from '@/lib/chart/pluginHost';
import { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT, type PaneLayout } from '@/lib/chart/panes';
import PaneSeparators from './PaneSeparators';
import PaneControlBar from './PaneControlBar';
import { fetchYahooCandles, applyVisibleSlice, mergeCandlesPrepend, fetchOlderCandles, shouldPrefetchEdge, transformCandlesForChartType } from '@/lib/chart/series';
import type { Candle } from '@/lib/chart/contracts';
import { hitTestAll, hitTestControlPoint, restoreAll, serializeAll } from '@/lib/chart/pluginHost';
import { plotToPoint } from '@/lib/chart/drawingCoords';
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
  startDraggingCp,
  stopDraggingCp,
  drawingModeFromState,
  shouldHideCrosshair,
  shouldSuppressPan,
  newDrawingId,
  getPluginForTool,
} from '@/lib/chart/drawingController';
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
  findDataIndexForTimestamp,
} from '@/lib/chart/crosshair';

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
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
  resetChartView: () => void;
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
  getRawCandleCount: () => number;
  getCandles: () => Candle[];
};

type Props = {
  config: CellConfig;
  theme: Theme;
  visibleCount?: number | null;
  chartId: string;
  onConfigChange?: (next: CellConfig) => void;
  onOverlayRightClick?: (overlay: TrackedOverlay, pos: { x: number; y: number }) => void;
  onChartContextMenu?: (pos: { x: number; y: number }) => void;
  onRemoveIndicator?: (name: string, pane: 'main' | 'sub') => void;
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
  /** Fired when crosshair moves locally (includes dataIndex for Object Tree). */
  onCrosshairMove?: (ev: {
    timestamp: number | null;
    dataIndex: number | null;
    valueLabel: string | null;
  }) => void;
  /** Fired when a legend action button is clicked (e.g. settings-{indicatorId}). */
  onLegendAction?: (actionId: string) => void;
};

const EdgeChart = forwardRef<ChartHandle, Props>(function EdgeChart(props, ref) {
  const {
    config,
    theme,
    visibleCount = null,
    onConfigChange,
    onOverlayRightClick,
    onChartContextMenu,
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
    onCrosshairMove,
    onLegendAction,
  } = props;

  const onDataLoadedRef = useRef(onDataLoaded);
  onDataLoadedRef.current = onDataLoaded;

  const onCrosshairTimestampRef = useRef(onCrosshairTimestamp);
  onCrosshairTimestampRef.current = onCrosshairTimestamp;

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const onLegendActionRef = useRef(onLegendAction);
  onLegendActionRef.current = onLegendAction;

  const containerRef = useRef<HTMLDivElement>(null);
  const [baseCandles, setBaseCandles] = useState<Candle[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
  const [drawTick, setDrawTick] = useState(0);
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
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
  const configRef = useRef(config);
  configRef.current = config;
  const drawingsRef = useRef<SerializedDrawing[]>([]);
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

  const hydrateDrawings = useCallback(
    (data: SerializedDrawing[]) => {
      const withIds = data.map((d, i) => ({ ...d, id: d.id ?? `d${i}` }));
      drawingsRef.current = withIds;
      trackedRef.current.clear();
      restoreAll(withIds).forEach((overlay) => {
        trackedRef.current.set(overlay.id, overlay);
      });
      notifyOverlayChange();
    },
    [notifyOverlayChange],
  );

  const finishAfterCommit = useCallback((state: DrawingControllerState): DrawingControllerState => {
    if (!keepDrawingRef.current && state.activeTool) {
      return disarmTool(state);
    }
    return state;
  }, []);

  const addCommittedDrawing = useCallback(
    (drawing: SerializedDrawing) => {
      const id = drawing.id ?? newDrawingId();
      const full: SerializedDrawing = { ...drawing, id, paneId: drawing.paneId ?? 'price' };
      drawingsRef.current = [...drawingsRef.current, full];
      const overlay = restoreAll([full])[0];
      trackedRef.current.set(id, overlay);
      notifyOverlayChange();
      return id;
    },
    [notifyOverlayChange]
  );

  const paneSegmentsRef = useRef<PaneSegment[]>([]);
  const latestVpRef = useRef<VisibleRange | null>(null);

  const applyCrosshairFromSync = useCallback((timestamp: number | null) => {
    syncingCrosshairRef.current = true;
    try {
      if (timestamp == null) {
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
      drawingsRef.current = [];
      trackedRef.current.clear();
      const next = disarmTool(drawingStateRef.current);
      syncDrawingState(next);
      setPreviewDrawing(null);
      notifySelectionChange(null);
      notifyOverlayChange();
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
      const el = containerRef.current;
      if (!priceHandle || !el) return;
      const anchorX = el.clientWidth / 2;
      const vp = priceHandle.applyWheelAction({ type: 'zoom', factor: 1.25 }, anchorX);
      if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
    },
    lockAllDrawings: (locked: boolean) => {
      for (const o of trackedRef.current.values()) {
        o.locked = locked;
        const d = drawingsRef.current.find((x) => x.id === o.id);
        if (d) (d as { locked: boolean }).locked = locked;
      }
      notifyOverlayChange();
    },
    areAllDrawingsLocked: () => {
      const list = Array.from(trackedRef.current.values());
      return list.length > 0 && list.every((o) => o.locked);
    },
    setAllDrawingsVisible: (visible: boolean) => {
      for (const o of trackedRef.current.values()) {
        o.visible = visible;
        const d = drawingsRef.current.find((x) => x.id === o.id);
        if (d) (d as { visible: boolean }).visible = visible;
      }
      notifyOverlayChange();
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
      const el = containerRef.current;
      if (el) setDims({ width: el.clientWidth, height: el.clientHeight });
    },
    onCrosshair: (cb) => {
      crosshairCbsRef.current.add(cb);
      return () => crosshairCbsRef.current.delete(cb);
    },
    setCrosshairFromSync: applyCrosshairFromSync,
    getTrackedOverlays: () => Array.from(trackedRef.current.values()),
    removeOverlay: (id) => {
      trackedRef.current.delete(id);
      drawingsRef.current = drawingsRef.current.filter((d) => d.id !== id);
      if (drawingStateRef.current.selectedId === id) {
        const next = selectDrawingState(drawingStateRef.current, null);
        syncDrawingState(next);
        notifySelectionChange(null);
      }
      notifyOverlayChange();
    },
    setOverlayVisible: (id, visible) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.visible = visible;
        const d = drawingsRef.current.find((x) => x.id === id);
        if (d) (d as any).visible = visible;
        notifyOverlayChange();
      }
    },
    setOverlayLocked: (id, locked) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.locked = locked;
        const d = drawingsRef.current.find((x) => x.id === id);
        if (d) (d as any).locked = locked;
        notifyOverlayChange();
      }
    },
    renameOverlay: (id, label) => {
      const o = trackedRef.current.get(id);
      if (o) {
        o.label = label;
        const d = drawingsRef.current.find((x) => x.id === id);
        if (d) d.label = label;
        notifyOverlayChange();
      }
    },
    duplicateOverlay: (id) => {
      const src = drawingsRef.current.find((d) => d.id === id);
      if (!src) return null;
      const clone: SerializedDrawing = {
        ...src,
        id: newDrawingId(),
        label: `${src.label} copy`,
        points: src.points.map((p) => ({
          ...p,
          timestamp: p.timestamp != null ? p.timestamp + 86400000 : p.timestamp,
          value: p.value != null ? p.value * 1.005 : p.value,
        })),
        zLevel: src.zLevel + 1,
      };
      addCommittedDrawing(clone);
      return clone.id ?? null;
    },
    bringForward: (id) => {
      const sorted = [...drawingsRef.current].sort((a, b) => a.zLevel - b.zLevel);
      const idx = sorted.findIndex((d) => d.id === id);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const nextZ = sorted[idx + 1].zLevel;
      sorted[idx].zLevel = nextZ + 1;
      drawingsRef.current = sorted;
      const meta = trackedRef.current.get(id);
      if (meta) meta.zLevel = sorted[idx].zLevel;
      notifyOverlayChange();
    },
    sendBackward: (id) => {
      const sorted = [...drawingsRef.current].sort((a, b) => a.zLevel - b.zLevel);
      const idx = sorted.findIndex((d) => d.id === id);
      if (idx <= 0) return;
      const prevZ = sorted[idx - 1].zLevel;
      sorted[idx].zLevel = Math.max(0, prevZ - 1);
      drawingsRef.current = sorted;
      const meta = trackedRef.current.get(id);
      if (meta) meta.zLevel = sorted[idx].zLevel;
      notifyOverlayChange();
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
    isViewportModified: () => {
      for (const handle of paneHandlesRef.current.values()) {
        if (handle.isViewportModified()) return true;
      }
      return false;
    },
    getRawCandleCount: () => baseCandlesRef.current.length,
    getCandles: () => candlesRef.current,
  }), [notifyOverlayChange, applyCrosshairFromSync, syncDrawingState, notifySelectionChange, addCommittedDrawing, hydrateDrawings]);

  // Data fetch — full base dataset; replay slice applied separately
  useEffect(() => {
    let cancelled = false;
    fetchStateRef.current.hasMoreHistory = true;
    fetchStateRef.current.abortController?.abort();
    fetchStateRef.current.abortController = null;
    fetchStateRef.current.inFlight = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const raw = await fetchYahooCandles(config.symbol, config.range, config.interval);
        if (cancelled) return;
        baseCandlesRef.current = raw;
        setBaseCandles(raw);
        onDataLoadedRef.current?.({ count: raw.length });
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.symbol, config.range, config.interval]);

  // Apply chart type transform + Bar Replay slice without re-fetching
  useEffect(() => {
    const transformed = transformCandlesForChartType(baseCandles, config.chartType);
    const sliced = applyVisibleSlice(transformed, visibleCount);
    candlesRef.current = sliced;
    setCandles(sliced);
  }, [baseCandles, config.chartType, visibleCount]);

  // Resize observer for real dimensions
  useEffect(() => {
    const el = containerRef.current;
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
    if (loading || error || candles.length === 0) return;
    if (trackedRef.current.size > 0) return;
    if (!config.drawings?.length) return;
    hydrateDrawings(config.drawings);
  }, [loading, error, candles.length, config.drawings, hydrateDrawings]);

  const handleCrosshairMove = useCallback((event: CrosshairMoveEvent | null) => {
    if (!event) {
      if (wheelingRef.current) return;
      setCrosshair(null);
      if (!syncingCrosshairRef.current) {
        crosshairCbsRef.current.forEach((cb) => cb(null));
        onCrosshairTimestampRef.current?.(null);
        onCrosshairMoveRef.current?.({
          timestamp: null,
          dataIndex: null,
          valueLabel: null,
        });
      }
      return;
    }

    const segment = paneSegmentsRef.current.find((s) => s.paneId === event.paneId);
    if (!segment) return;

    setCrosshair({
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
    });
    if (!syncingCrosshairRef.current) {
      crosshairCbsRef.current.forEach((cb) => cb(event.timestamp));
      onCrosshairTimestampRef.current?.(event.timestamp);
      onCrosshairMoveRef.current?.({
        timestamp: event.timestamp,
        dataIndex: event.dataIndex,
        valueLabel: event.valueLabel,
      });
    }
  }, []);

  const syncSiblings = useCallback((startIndex: number, endIndex: number, sourcePaneId: string) => {
    paneHandlesRef.current.forEach((handle, id) => {
      if (id !== sourcePaneId) handle.syncTimeWindow(startIndex, endIndex);
    });
  }, []);

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

    if (paneId !== 'price' || !shouldPrefetchEdge(vp.startIndex)) return;
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
      vp = priceHandle.applyWheelAction(action, batch.anchorX);
    }

    if (vp) syncSiblings(vp.startIndex, vp.endIndex, 'price');
  }, [syncSiblings]);

  // Single non-passive wheel listener on the chart container — one authority, rAF-batched.
  useEffect(() => {
    const el = containerRef.current;
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
    const el = containerRef.current;
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

  const getPriceShowTimeAxis = useCallback(() => {
    const segment = paneSegmentsRef.current.find((s) => s.paneId === 'price');
    return segment?.showTimeAxis ?? true;
  }, []);

  const placingAnchorRef = useRef<{ plotX: number; plotY: number } | null>(null);

  const handleDrawingPointer = useCallback(
    (event: DrawingPointerEvent) => {
      const vp = paneHandlesRef.current.get('price')?.getViewport() ?? latestVpRef.current;
      if (!vp || candlesRef.current.length === 0) return;
      const showTimeAxis = getPriceShowTimeAxis();
      const point = plotToPoint(event.plotX, event.plotY, vp, candlesRef.current, {
        magnet: magnetEnabledRef.current,
        showTimeAxis,
      });
      let state = drawingStateRef.current;

      if (state.fsm === 'dragging_cp' && event.phase === 'move' && state.draggingDrawingId != null) {
        const drawing = drawingsRef.current.find((d) => d.id === state.draggingDrawingId);
        const plugin = drawing ? getPluginForTool(drawing.name) : undefined;
        if (drawing && plugin?.updateFromControl && !drawing.locked) {
          const pt = plotToPoint(event.plotX, event.plotY, vp, candlesRef.current, {
            magnet: magnetEnabledRef.current,
            showTimeAxis,
          });
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
          drawingsRef.current = drawingsRef.current.map((d) =>
            d.id === drawing.id ? updated : d
          );
          notifyOverlayChange();
        }
        return;
      }

      if (event.phase === 'down') {
        if (state.fsm === 'selected' && state.selectedId) {
          const drawing = drawingsRef.current.find((d) => d.id === state.selectedId);
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
              state = startDraggingCp(state, state.selectedId, cpIdx);
              syncDrawingState(state);
              return;
            }
          }
        }

        const hitId =
          state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed'
            ? hitTestAll(
                event.plotX,
                event.plotY,
                drawingsRef.current,
                vp,
                candlesRef.current,
                showTimeAxis
              )
            : null;

        if (hitId && (state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed')) {
          state = selectDrawingState(state, hitId);
          syncDrawingState(state);
          notifySelectionChange(hitId);
          return;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          let draft = state.placingDraft;
          if (plugin?.updatePreview) {
            draft = plugin.updatePreview(draft, point, vp, candlesRef.current);
          }
          if (plugin?.finalize) draft = plugin.finalize(draft, vp, candlesRef.current);
          const { state: nextState, drawing } = commitDrawing(
            state,
            draft,
            drawingsRef.current
          );
          addCommittedDrawing(drawing);
          syncDrawingState(finishAfterCommit(nextState));
          setPreviewDrawing(null);
          placingAnchorRef.current = null;
          return;
        }

        if (state.fsm === 'selected') {
          state = selectDrawingState(state, null);
          syncDrawingState(state);
          notifySelectionChange(null);
        }

        if (state.fsm === 'tool_armed' && state.activeTool) {
          const tool = state.activeTool;
          if (isOnePointTool(tool)) {
            const draft = createDraftFromPoint(tool, point, vp, candlesRef.current);
            if (!draft) return;
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
            return;
          }
          if (isTwoPointTool(tool)) {
            const draft = createDraftFromPoint(tool, point, vp, candlesRef.current);
            if (!draft) return;
            state = startPlacing(state, draft);
            syncDrawingState(state);
            setPreviewDrawing(draft);
            placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
            return;
          }
        }
      }

      if (event.phase === 'move') {
        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          const updated =
            plugin?.updatePreview?.(state.placingDraft, point, vp, candlesRef.current) ??
            state.placingDraft;
          drawingStateRef.current = { ...state, placingDraft: updated };
          setPreviewDrawing(updated);
        }
        return;
      }

      if (event.phase === 'up') {
        if (state.fsm === 'dragging_cp') {
          state = stopDraggingCp(state);
          syncDrawingState(state);
          return;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const anchor = placingAnchorRef.current;
          const moved =
            anchor &&
            Math.hypot(event.plotX - anchor.plotX, event.plotY - anchor.plotY) > 5;
          if (moved) {
            const plugin = getPluginForTool(state.activeTool);
            let draft = state.placingDraft;
            if (plugin?.updatePreview) {
              draft = plugin.updatePreview(draft, point, vp, candlesRef.current);
            }
            if (plugin?.finalize) draft = plugin.finalize(draft, vp, candlesRef.current);
            const { state: nextState, drawing } = commitDrawing(
              state,
              draft,
              drawingsRef.current
            );
            addCommittedDrawing(drawing);
            syncDrawingState(finishAfterCommit(nextState));
            setPreviewDrawing(null);
            placingAnchorRef.current = null;
          }
        }
      }
    },
    [
      getPriceShowTimeAxis,
      finishAfterCommit,
      syncDrawingState,
      notifySelectionChange,
      addCommittedDrawing,
      notifyOverlayChange,
    ]
  );

  const handleDrawingContextMenu = useCallback(
    (event: DrawingPointerEvent & { clientX: number; clientY: number }) => {
      const vp = paneHandlesRef.current.get('price')?.getViewport() ?? latestVpRef.current;
      if (!vp) return;
      const showTimeAxis = getPriceShowTimeAxis();
      const hitId = hitTestAll(
        event.plotX,
        event.plotY,
        drawingsRef.current,
        vp,
        candlesRef.current,
        showTimeAxis
      );
      if (!hitId) return;
      const meta = trackedRef.current.get(hitId);
      if (meta && onOverlayRightClickRef.current) {
        const next = selectDrawingState(drawingStateRef.current, hitId);
        syncDrawingState(next);
        notifySelectionChange(hitId);
        onOverlayRightClickRef.current(meta, { x: event.clientX, y: event.clientY });
      }
    },
    [getPriceShowTimeAxis, syncDrawingState, notifySelectionChange]
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
        candles,
        crosshair?.dataIndex ?? null,
        theme,
      );
      if (!sections) return null;
      const plugin = IndicatorRegistry.get(ind.name);
      if (plugin?.paramSchema && Object.keys(plugin.paramSchema).length > 0) {
        return appendLegendSettingsAction(sections, ind.id);
      }
      return sections;
    },
    [candles, crosshair?.dataIndex, theme],
  );

  const handleLegendAction = useCallback((actionId: string) => {
    onLegendActionRef.current?.(actionId);
  }, []);

  const priceDrawings = useMemo(() => [...drawingsRef.current], [drawTick]);
  const activeTool = activeDrawingTool ?? '__cursor__';
  const drawingMode = drawingModeFromState(drawingFsm);
  const hideCrosshair = shouldHideCrosshair(drawingFsm);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onChartContextMenu?.({ x: e.clientX, y: e.clientY });
    },
    [onChartContextMenu],
  );

  return (
    <div
      ref={containerRef}
      data-edge-chart
      className="relative flex min-h-0 w-full flex-1 flex-col"
      style={{ touchAction: 'none' }}
      onContextMenu={handleContextMenu}
      onMouseLeave={() => {
        if (!wheelingRef.current) handleCrosshairMove(null);
      }}
    >
      {(loading || error) && (
        <div className="absolute left-2 top-2 z-10 text-xs text-gray-500">
          {loading ? 'Loading…' : error}
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
                {!loading && !error && (hasMultiplePanes || pane.isCollapsed) && (
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
                {!loading && !error && candles.length > 0 && (
                  <>
                    <ChartLegendBar
                      symbol={config.symbol}
                      symbolName={config.symbolName}
                      exchange={config.exchange}
                      interval={config.interval}
                      candles={candles}
                      dataIndex={crosshair?.dataIndex ?? null}
                      theme={theme}
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
                    candles={candles}
                    chartType={config.chartType}
                    theme={theme}
                    visibleCount={visibleCount}
                    width={dims.width}
                    height={pane.height}
                    drawings={priceDrawings}
                    previewDrawing={previewDrawing}
                    selectedDrawingId={selectedDrawingId}
                    drawingMode={drawingMode}
                    indicators={mainIndicators}
                    registerPane={registerPane}
                    wheelingRef={wheelingRef}
                    interval={config.interval}
                    showTimeAxis={showTimeAxis}
                    activeTool={activeTool}
                    suppressCrosshair={hideCrosshair}
                    onDrawingPointer={handleDrawingPointer}
                    onDrawingContextMenu={handleDrawingContextMenu}
                    onCrosshairMove={handleCrosshairMove}
                    onViewportChange={handleViewport}
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
              {!loading && !error && (hasMultiplePanes || pane.isCollapsed) && (
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
                  onRemove={() => onRemoveIndicator?.(subInd.name, 'sub')}
                  onCollapse={() => onCollapseIndicator?.(pane.key)}
                  onMaximize={() => onMaximizeIndicator?.(pane.key)}
                />
              )}
              {!loading && !error && candles.length > 0 && (() => {
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
                  candles={candles}
                  chartType={config.chartType}
                  theme={theme}
                  visibleCount={visibleCount}
                  width={dims.width}
                  height={pane.height}
                  drawings={[]}
                  indicators={[subInd]}
                  registerPane={registerPane}
                  wheelingRef={wheelingRef}
                  interval={config.interval}
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
        crosshair={hideCrosshair ? null : crosshair}
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
  );
});

export default EdgeChart;
