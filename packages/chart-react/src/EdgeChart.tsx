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
  IndicatorConfig,
} from '@edge/chart-core';
import type { VisibleRange, CrosshairMoveEvent, CrosshairState, PaneSegment } from '@edge/chart-core';
import type { ChartPaneHandle, RegisterPane } from './engine/paneHandle';
import { PRICE_PANE_KEY } from '@edge/chart-core';
import ChartCanvas from './engine/canvas';
import CrosshairOverlay from './engine/CrosshairOverlay';
import { mergeChartSettings } from './engine/chartSettings';
import ChartLegendBar from './components/ChartLegendBar';
import PaneLegendBar from './components/PaneLegendBar';
import { resolveIndicatorLegend, appendLegendSettingsAction, indicatorHasSettings } from './engine/legend';
import { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT, type Pane, type PaneLayout } from '@edge/chart-core/panes';
import PaneSeparators from './components/PaneSeparators';
import PaneControlBar from './components/PaneControlBar';
import { applyVisibleSlice, mergeCandlesPrepend, shouldPrefetchEdge, transformCandlesForChartType, ensureCandlesCover } from '@edge/chart-core/series';
import type { Candle, Range, Interval } from '@edge/chart-core';
import { buildCandleSessionKey, resolveViewportRevision } from './engine/rangePresetTransition';
import { goToDate, goToRange, type GoToRequest, type GoToResult } from './engine/goTo';
import { shouldSuppressPan } from '@edge/chart-core/drawingController';
import {
  mergeWheelBatch,
  normalizeWheelDelta,
  zoomFactorForDelta,
} from '@edge/chart-core/wheel';
import { createPinchHandler } from '@edge/chart-core/pinch';
import {
  adjustViewportForPrepend,
} from './engine/viewport';
import {
  buildSyncedCrosshairState,
  clampIndexToViewport,
  crosshairStatesEqual,
  findDataIndexForTimestamp,
} from '@edge/chart-core/crosshair';
import type { EdgeChartProps, EdgeChartHandle } from './types';
import { useDrawingController } from './drawing/useDrawingController';
import { createEdgeChartHandle } from './createEdgeChartHandle';
import { indicatorKey } from './indicatorKey';
import EventDetailCard, { type EventDetailAnchor } from './components/EventDetailCard';
import type { EventBadgeGroup } from './engine/eventBadges';

export type {
  EdgeChartProps,
  EdgeChartHandle,
  ChartHandle,
  IndicatorKey,
  DrawingScreenBounds,
} from './types';
export { indicatorKey, parseIndicatorKey, legacyParseIndicatorKey } from './indicatorKey';
export type { GoToRequest, GoToResult } from './engine/goTo';

const EdgeChart = forwardRef<EdgeChartHandle, EdgeChartProps>(function EdgeChart(props, ref) {
  const {
    candles: candlesProp,
    state,
    theme,
    visibleCount = null,
    loading = false,
    error = null,
    symbol = '',
    symbolName,
    exchange,
    interval = '1d',
    range = '1y',
    rangePreset = null,
    sessionKey: sessionKeyProp,
    onStateChange,
    onLoadOlderCandles,
    onRangePresetClear,
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
    onCandlesChange,
    onCrosshairMove,
    onLegendAction,
    compact = false,
    eventMarkers = [],
    referenceLines = [],
    annotationMarkers = [],
    suppressCrosshair: suppressCrosshairProp = false,
    selectedEventBadgeId: selectedEventBadgeIdProp = null,
    onEventBadgeClick,
    onEventBadgeHover,
    onEventBadgeMore,
  } = props;

  const onCandlesChangeRef = useRef(onCandlesChange);
  onCandlesChangeRef.current = onCandlesChange;

  const onCrosshairTimestampRef = useRef(onCrosshairTimestamp);
  onCrosshairTimestampRef.current = onCrosshairTimestamp;

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const onLegendActionRef = useRef(onLegendAction);
  onLegendActionRef.current = onLegendAction;

  const onLoadOlderCandlesRef = useRef(onLoadOlderCandles);
  onLoadOlderCandlesRef.current = onLoadOlderCandles;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [baseCandles, setBaseCandles] = useState<Candle[]>(candlesProp);
  const displayCandles = useMemo(() => {
    const transformed = transformCandlesForChartType(baseCandles, state.chartType);
    return applyVisibleSlice(transformed, visibleCount);
  }, [baseCandles, state.chartType, visibleCount]);

  /** Session identity — viewport reset on session change, not on history prepend. */
  const candleSessionKey = useMemo(
    () => sessionKeyProp ?? buildCandleSessionKey(symbol, range, interval),
    [sessionKeyProp, symbol, range, interval],
  );

  /** Session key for candles currently displayed (matches props, not pending navigation). */
  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null);

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
  const [displayInterval, setDisplayInterval] = useState<Interval>(interval);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
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
  const appliedCandlesSessionKeyRef = useRef<string | null>(null);
  const fetchStateRef = useRef({ inFlight: false, hasMoreHistory: true, abortController: null as AbortController | null });
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPannedTimeAxisRef = useRef(false);
  const goToImplRef = useRef<(req: GoToRequest) => Promise<GoToResult>>(async () => ({
    ok: false,
    reason: 'no_data',
  }));
  const pendingGoToNavigationRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const syncSiblingsRef = useRef<(startIndex: number, endIndex: number, sourcePaneId: string) => void>(() => {});
  const stateRef = useRef(state);
  stateRef.current = state;
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const paneSegmentsRef = useRef<PaneSegment[]>([]);
  const latestVpRef = useRef<VisibleRange | null>(null);
  const [dragHeights, setDragHeights] = useState<Record<string, number> | null>(null);
  const dragHeightsRef = useRef<Record<string, number> | null>(null);
  const layoutRef = useRef<PaneLayout | null>(null);

  const drawing = useDrawingController({
    paneHandlesRef,
    candlesRef,
    latestVpRef,
    paneSegmentsRef,
    stateRef,
    overlayChangeCbsRef,
    onDrawingDisarmed,
    onOverlayRightClick,
    loading,
    error,
    displayCandlesLength: displayCandles.length,
    stateDrawings: state.drawings,
  });

  const {
    drawingsRef,
    drawingFsmRef,
    selectedDrawingId,
    activeTool,
    drawingMode,
    hideCrosshair,
    handleDrawingPointer,
    handleDrawingContextMenu,
    paneDrawingsMap,
    previewForPane,
    hydrateDrawings,
    drawingHandleSlice,
  } = drawing;

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
          plotX: null,
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
        indicators: stateRef.current.indicators,
        interval: intervalRef.current,
        segment,
      });
      crosshairStateRef.current = nextCrosshair;
      setCrosshair(nextCrosshair);
      onCrosshairMoveRef.current?.({
        timestamp,
        dataIndex,
        valueLabel: nextCrosshair.valueLabel,
        plotX: nextCrosshair.plotX,
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
        plotX: null,
      });
      return;
    }
    crosshairCbsRef.current.forEach((cb) => cb(event.timestamp));
    onCrosshairTimestampRef.current?.(event.timestamp);
    onCrosshairMoveRef.current?.({
      timestamp: event.timestamp,
      dataIndex: event.dataIndex,
      valueLabel: event.valueLabel,
      plotX: event.plotX,
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
  useImperativeHandle(
    ref,
    () =>
      createEdgeChartHandle({
        stateRef,
        dragHeightsRef,
        drawingsRef,
        paneHandlesRef,
        chartAreaRef,
        baseCandlesRef,
        candlesRef,
        crosshairCbsRef,
        syncSiblingsRef,
        goToImplRef,
        setDims,
        hydrateDrawings,
        onStateChangeRef,
        applyCrosshairFromSync,
        drawingHandleSlice,
      }),
    [applyCrosshairFromSync, hydrateDrawings, drawingHandleSlice],
  );

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

  // Sync caller-provided candles — no network fetch inside the public component.
  useEffect(() => {
    const prev = baseCandlesRef.current;
    if (prev === candlesProp) {
      baseCandlesRef.current = candlesProp;
      return;
    }
    const sameTimeEnvelope =
      prev.length === candlesProp.length &&
      prev[0]?.t === candlesProp[0]?.t &&
      prev.at(-1)?.t === candlesProp.at(-1)?.t;
    if (sameTimeEnvelope && appliedCandlesSessionKeyRef.current === candleSessionKey) {
      baseCandlesRef.current = candlesProp;
      return;
    }
    baseCandlesRef.current = candlesProp;
    setBaseCandles(candlesProp);
    if (candlesProp.length > 0) {
      appliedCandlesSessionKeyRef.current = candleSessionKey;
      setLoadedSessionKey(candleSessionKey);
      setDisplayInterval(interval);
      fetchStateRef.current.hasMoreHistory = true;
    }
  }, [candlesProp, candleSessionKey, interval]);

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
  syncSiblingsRef.current = syncSiblings;

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
      onCandlesChangeRef.current?.(merged);
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

    const fetchOlder = (beforeMs: number) => {
      const loader = onLoadOlderCandlesRef.current;
      if (!loader) return Promise.resolve([] as Candle[]);
      return loader(beforeMs);
    };
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
        onCandlesChangeRef.current?.(candles);
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
        onCandlesChangeRef.current?.(candles);
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
      onCandlesChangeRef.current?.(candles);
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

    if (rangePreset != null) {
      onRangePresetClear?.();
    }

    return { ok: true };
  };

  const runEdgeFetch = useCallback(async () => {
    const base = baseCandlesRef.current;
    const loader = onLoadOlderCandlesRef.current;
    if (
      base.length === 0 ||
      !loader ||
      fetchStateRef.current.inFlight ||
      !fetchStateRef.current.hasMoreHistory
    ) {
      return;
    }
    const firstTs = base[0].t;
    fetchStateRef.current.inFlight = true;
    const controller = new AbortController();
    fetchStateRef.current.abortController = controller;
    try {
      const older = await loader(firstTs);
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
      onCandlesChangeRef.current?.(merged);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      fetchStateRef.current.hasMoreHistory = false;
    } finally {
      fetchStateRef.current.inFlight = false;
      fetchStateRef.current.abortController = null;
    }
  }, [syncSiblings]);

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

  // Compute pane layout for price + visible sub indicators
  const visibleIndicators = useMemo(
    () => state.indicators.filter((i) => i.visible !== false),
    [state.indicators],
  );
  const subKeys = visibleIndicators.filter((i) => i.pane === 'sub').map(indicatorKey);
  const effectivePaneHeights = dragHeights ?? state.paneHeights;
  const layout: PaneLayout = createInitialLayout(
    subKeys,
    dims.height || 400,
    collapsedKeys ?? new Set(),
    maximizedKey ?? null,
    effectivePaneHeights,
    paneOrder
  );
  layoutRef.current = layout;

  const paneSegments: PaneSegment[] = layout.stack.map((pane: Pane, i: number) => ({
    paneId: pane.key === PRICE_PANE_KEY ? 'price' : pane.key,
    top: pane.top,
    height: pane.height,
    showTimeAxis: i === layout.stack.length - 1,
  }));
  paneSegmentsRef.current = paneSegments;

  const paneBoundaries = computePaneBoundaries(layout);

  const handleSeparatorResize = useCallback(
    (boundaryIndex: number, deltaY: number) => {
      const base = dragHeightsRef.current ?? state.paneHeights ?? {};
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
    [subKeys, state.paneHeights, dims.height, collapsedKeys, maximizedKey, paneOrder]
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
        state.chartSettings,
      );
      if (!sections) return null;
      if (indicatorHasSettings(ind.name)) {
        return appendLegendSettingsAction(sections, ind.id);
      }
      return sections;
    },
    [displayCandles, crosshair?.dataIndex, theme, state.chartSettings],
  );

  const handleLegendAction = useCallback((actionId: string) => {
    onLegendActionRef.current?.(actionId);
  }, []);

  const suppressCrosshair = hideCrosshair || suppressCrosshairProp;
  const chartSettings = useMemo(
    () => mergeChartSettings(state.chartSettings),
    [state.chartSettings],
  );
  const showCrosshairOverlay = chartSettings.canvas.showCrosshair && !suppressCrosshair;

  const [selectedEventBadgeId, setSelectedEventBadgeId] = useState<string | null>(null);
  const [eventDetailGroup, setEventDetailGroup] = useState<EventBadgeGroup | null>(null);
  const [eventDetailAnchor, setEventDetailAnchor] = useState<EventDetailAnchor | null>(null);

  const effectiveSelectedEventBadgeId =
    selectedEventBadgeIdProp ?? selectedEventBadgeId;

  useEffect(() => {
    setSelectedEventBadgeId(null);
    setEventDetailGroup(null);
    setEventDetailAnchor(null);
  }, [symbol, candleSessionKey]);

  const handleEventBadgeClick = useCallback(
    (
      group: EventBadgeGroup,
      pos: { clientX: number; clientY: number; plotX: number; plotY: number },
    ) => {
      if (onEventBadgeClick) {
        onEventBadgeClick(group, pos);
        return;
      }
      setSelectedEventBadgeId(group.id);
      setEventDetailGroup(group);
      setEventDetailAnchor(pos);
    },
    [onEventBadgeClick],
  );

  const handleEventBadgeHover = useCallback(
    (group: EventBadgeGroup | null) => {
      onEventBadgeHover?.(group);
    },
    [onEventBadgeHover],
  );

  const handleEventDetailClose = useCallback(() => {
    setSelectedEventBadgeId(null);
    setEventDetailGroup(null);
    setEventDetailAnchor(null);
  }, []);

  const handleEventBadgeMore = useCallback(
    (group: EventBadgeGroup) => {
      onEventBadgeMore?.(group);
    },
    [onEventBadgeMore],
  );

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

      {layout.stack.map((pane: Pane, i: number) => {
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
                    ? ' border-y border-[var(--edge-border)] bg-[var(--edge-surface-panel)]'
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
                    {state.mainSeriesVisible !== false && (
                      <ChartLegendBar
                        symbol={symbol}
                        symbolName={symbolName}
                        exchange={exchange}
                        interval={displayInterval}
                        candles={displayCandles}
                        dataIndex={crosshair?.dataIndex ?? null}
                        theme={theme}
                        chartSettings={chartSettings}
                        compact={pane.isCollapsed}
                      />
                    )}
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
                    chartType={state.chartType}
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
                    suppressCrosshair={suppressCrosshair}
                    chartSettings={chartSettings}
                    mainSeriesVisible={state.mainSeriesVisible !== false}
                    onDrawingPointer={handleDrawingPointer}
                    onDrawingContextMenu={handleDrawingContextMenu}
                    onPriceScaleContextMenu={onPriceScaleContextMenu}
                    onCrosshairMove={handleCrosshairMove}
                    onViewportChange={handleViewport}
                    range={range}
                    rangePreset={rangePreset ?? null}
                    viewportRevision={viewportRevision}
                    onUserTimePan={markUserTimePan}
                    eventMarkers={eventMarkers}
                    referenceLines={referenceLines}
                    annotationMarkers={annotationMarkers}
                    selectedEventBadgeId={effectiveSelectedEventBadgeId}
                    onEventBadgeClick={handleEventBadgeClick}
                    onEventBadgeHover={handleEventBadgeHover}
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
                  ? ' border-y border-[var(--edge-border)] bg-[var(--edge-surface-panel)]'
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
                  chartType={state.chartType}
                  theme={theme}
                  visibleCount={visibleCount}
                  width={dims.width}
                  height={pane.height}
                  drawings={paneDrawingsMap.get(pane.key) ?? []}
                  previewDrawing={previewForPane(pane.key)}
                  selectedDrawingId={selectedDrawingId}
                  drawingMode={drawingMode}
                  suppressCrosshair={suppressCrosshair}
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

      {!onEventBadgeClick && (
        <EventDetailCard
          open={eventDetailGroup != null}
          group={eventDetailGroup}
          anchor={eventDetailAnchor}
          theme={theme}
          chartBounds={chartAreaRef.current?.getBoundingClientRect() ?? null}
          interval={displayInterval}
          onClose={handleEventDetailClose}
          onMoreEvents={onEventBadgeMore ? handleEventBadgeMore : undefined}
        />
      )}

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
