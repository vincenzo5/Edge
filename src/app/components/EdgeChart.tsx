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
import { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT, type PaneLayout } from '@/lib/chart/panes';
import PaneSeparators from './PaneSeparators';
import { fetchYahooCandles, toHeikinAshi, applyVisibleSlice } from '@/lib/chart/series';
import type { Candle } from '@/lib/chart/contracts';
import { hitTestAll, hitTestControlPoint, serializeAll } from '@/lib/chart/pluginHost';
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
  newDrawingId,
  getPluginForTool,
} from '@/lib/chart/drawingController';
import {
  mergeWheelBatch,
  normalizeWheelDelta,
  zoomFactorForDelta,
} from '@/lib/chart/wheel';
import {
  buildSyncedCrosshairState,
  clampIndexToViewport,
  findDataIndexForTimestamp,
} from '@/lib/chart/crosshair';

export type IndicatorKey = string;
export function indicatorKey(ind: IndicatorConfig): IndicatorKey {
  return `${ind.name}::${ind.pane}`;
}
export function parseIndicatorKey(key: IndicatorKey): IndicatorConfig | null {
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
  } = props;

  const onCrosshairTimestampRef = useRef(onCrosshairTimestamp);
  onCrosshairTimestampRef.current = onCrosshairTimestamp;

  const containerRef = useRef<HTMLDivElement>(null);
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
  const configRef = useRef(config);
  configRef.current = config;
  const drawingsRef = useRef<SerializedDrawing[]>(config.drawings ?? []);
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
  const selectionChangeCbsRef = useRef<Set<(id: string | null) => void>>(new Set());
  const onOverlayRightClickRef = useRef(onOverlayRightClick);
  onOverlayRightClickRef.current = onOverlayRightClick;

  const syncDrawingState = useCallback((next: DrawingControllerState) => {
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

  const addCommittedDrawing = useCallback(
    (drawing: SerializedDrawing) => {
      const id = drawing.id ?? newDrawingId();
      const full: SerializedDrawing = { ...drawing, id, paneId: drawing.paneId ?? 'price' };
      drawingsRef.current = [...drawingsRef.current, full];
      trackedRef.current.set(id, {
        id,
        name: full.name,
        label: full.label,
        visible: full.visible,
        locked: full.locked,
        zLevel: full.zLevel,
        paneId: 'price',
      });
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
      setCrosshair(
        buildSyncedCrosshairState({
          dataIndex,
          vp,
          candles: series,
          indicators: configRef.current.indicators,
          interval: configRef.current.interval,
          segment,
        }),
      );
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
      const withIds = data.map((d, i) => ({ ...d, id: d.id ?? `d${i}` }));
      drawingsRef.current = withIds;
      trackedRef.current.clear();
      withIds.forEach((d) => {
        const id = d.id!;
        trackedRef.current.set(id, {
          id,
          name: d.name,
          label: d.label,
          visible: d.visible,
          locked: d.locked,
          zLevel: d.zLevel,
          paneId: d.paneId ?? 'price',
        });
      });
      notifyOverlayChange();
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
  }), [notifyOverlayChange, applyCrosshairFromSync, syncDrawingState, notifySelectionChange, addCommittedDrawing]);

  // Data fetch (same contract as before)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const raw = await fetchYahooCandles(config.symbol, config.range, config.interval);
        if (cancelled) return;
        const data = config.chartType === 'heikin_ashi' ? toHeikinAshi(raw) : raw;
        const sliced = applyVisibleSlice(data, visibleCount);
        setCandles(sliced);
        candlesRef.current = sliced;
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.symbol, config.range, config.interval, config.chartType, visibleCount]);

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
    if (drawingsRef.current.length === 0 && config.drawings?.length) {
      const withIds = config.drawings.map((d, i) => ({ ...d, id: d.id ?? `d${i}` }));
      drawingsRef.current = withIds;
      withIds.forEach((d) => {
        const id = d.id!;
        trackedRef.current.set(id, {
          id,
          name: d.name,
          label: d.label,
          visible: d.visible,
          locked: d.locked,
          zLevel: d.zLevel,
          paneId: d.paneId ?? 'price',
        });
      });
      notifyOverlayChange();
    }
  }, [loading, error, candles.length, config.drawings, notifyOverlayChange]);

  const handleCrosshairMove = useCallback((event: CrosshairMoveEvent | null) => {
    if (!event) {
      if (wheelingRef.current) return;
      setCrosshair(null);
      if (!syncingCrosshairRef.current) {
        crosshairCbsRef.current.forEach((cb) => cb(null));
        onCrosshairTimestampRef.current?.(null);
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
    }
  }, []);

  const syncSiblings = useCallback((startIndex: number, endIndex: number, sourcePaneId: string) => {
    paneHandlesRef.current.forEach((handle, id) => {
      if (id !== sourcePaneId) handle.syncTimeWindow(startIndex, endIndex);
    });
  }, []);

  const registerPane: RegisterPane = useCallback((handle) => {
    paneHandlesRef.current.set(handle.paneId, handle);
    return () => paneHandlesRef.current.delete(handle.paneId);
  }, []);

  const handleViewport = useCallback((vp: VisibleRange, paneId: string) => {
    if (paneId === 'price') latestVpRef.current = vp;
    syncSiblings(vp.startIndex, vp.endIndex, paneId);
  }, [syncSiblings]);

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
          syncDrawingState(nextState);
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
            syncDrawingState(nextState);
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
            syncDrawingState(nextState);
            setPreviewDrawing(null);
            placingAnchorRef.current = null;
          }
        }
      }
    },
    [
      getPriceShowTimeAxis,
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

  // Compute pane layout for price + sub indicators
  const subKeys = config.indicators.filter((i) => i.pane === 'sub').map(indicatorKey);
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
    () => config.indicators.filter((i) => i.pane === 'main'),
    [config.indicators]
  );
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
              <div className="relative" style={{ height: pane.height, flexShrink: 0 }}>
                {!loading && !error && candles.length > 0 && (
                  <ChartLegendBar
                    symbol={config.symbol}
                    symbolName={config.symbolName}
                    exchange={config.exchange}
                    interval={config.interval}
                    candles={candles}
                    dataIndex={
                      crosshair?.activePaneId === 'price' ? crosshair.dataIndex : null
                    }
                    theme={theme}
                  />
                )}
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
              </div>
            </Fragment>
          );
        }

        const subInd = config.indicators.find((ind) => indicatorKey(ind) === pane.key);
        if (!subInd) return null;

        return (
          <Fragment key={pane.key}>
            {i > 0 && (
              <div
                aria-hidden
                style={{ height: PANE_SEPARATOR_HEIGHT, flexShrink: 0 }}
              />
            )}
            <div style={{ height: pane.height, flexShrink: 0 }}>
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
