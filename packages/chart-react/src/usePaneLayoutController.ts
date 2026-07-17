'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import type { IndicatorConfig, PaneSegment, SerializedChartState, Theme, VisibleRange } from '@edge/chart-core';
import { PRICE_PANE_KEY } from '@edge/chart-core';
import type { Candle } from '@edge/chart-core';
import {
  createInitialLayout,
  applyBoundaryResize,
  computePaneBoundaries,
  type Pane,
  type PaneLayout,
} from '@edge/chart-core/panes';
import { resolveIndicatorLegend, appendLegendSettingsAction, indicatorHasSettings } from './engine/legend';
import type { ChartPaneHandle, RegisterPane } from './engine/paneHandle';
import type { HistoryPrefetchController } from './engine/historyPrefetchController';
import { indicatorKey } from './indicatorKey';

export type PaneLayoutControllerDeps = {
  state: SerializedChartState;
  theme: Theme;
  displayCandles: Candle[];
  crosshairDataIndex: number | null;
  chartAreaRef: RefObject<HTMLDivElement | null>;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  latestVpRef: RefObject<VisibleRange | null>;
  userPannedTimeAxisRef: RefObject<boolean>;
  prefetchControllerRef: RefObject<HistoryPrefetchController | null>;
  collapsedKeys?: Set<string>;
  maximizedKey?: string | null;
  paneOrder?: string[];
  onPaneHeightsChange?: (heights: Record<string, number>) => void;
  paneSegmentsRef: MutableRefObject<PaneSegment[]>;
};

export type PaneLayoutController = {
  dims: { width: number; height: number };
  layout: PaneLayout;
  paneSegments: PaneSegment[];
  paneSegmentsRef: RefObject<PaneSegment[]>;
  paneBoundaries: ReturnType<typeof computePaneBoundaries>;
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  layoutRef: RefObject<PaneLayout | null>;
  dragHeightsRef: RefObject<Record<string, number> | null>;
  syncSiblingsRef: RefObject<(startIndex: number, endIndex: number, sourcePaneId: string) => void>;
  visibleIndicators: IndicatorConfig[];
  mainIndicators: IndicatorConfig[];
  hasMultiplePanes: boolean;
  registerPane: RegisterPane;
  syncSiblings: (startIndex: number, endIndex: number, sourcePaneId: string) => void;
  handleViewport: (vp: VisibleRange, paneId: string) => void;
  handleSeparatorResize: (boundaryIndex: number, deltaY: number) => void;
  handleSeparatorResizeEnd: () => void;
  buildIndicatorLegendSections: (ind: IndicatorConfig) => ReturnType<typeof resolveIndicatorLegend>;
  setDims: (dims: { width: number; height: number }) => void;
};

export function usePaneLayoutController(deps: PaneLayoutControllerDeps): PaneLayoutController {
  const {
    state,
    theme,
    displayCandles,
    crosshairDataIndex,
    chartAreaRef,
    paneHandlesRef,
    latestVpRef,
    userPannedTimeAxisRef,
    prefetchControllerRef,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    onPaneHeightsChange,
    paneSegmentsRef,
  } = deps;

  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });
  const [dragHeights, setDragHeights] = useState<Record<string, number> | null>(null);
  const dragHeightsRef = useRef<Record<string, number> | null>(null);
  const layoutRef = useRef<PaneLayout | null>(null);
  const syncSiblingsRef = useRef<(startIndex: number, endIndex: number, sourcePaneId: string) => void>(() => {});

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
    paneOrder,
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
  const hasMultiplePanes = layout.stack.length > 1;

  const mainIndicators = useMemo(
    () => visibleIndicators.filter((i) => i.pane === 'main'),
    [visibleIndicators],
  );

  const syncSiblings = useCallback((startIndex: number, endIndex: number, sourcePaneId: string) => {
    paneHandlesRef.current?.forEach((handle, id) => {
      if (id !== sourcePaneId) handle.syncTimeWindow(startIndex, endIndex);
    });
  }, [paneHandlesRef]);
  syncSiblingsRef.current = syncSiblings;

  const handleViewport = useCallback(
    (vp: VisibleRange, paneId: string) => {
      if (paneId === 'price') latestVpRef.current = vp;
      syncSiblings(vp.startIndex, vp.endIndex, paneId);

      if (paneId !== 'price' || !userPannedTimeAxisRef.current) {
        return;
      }
      prefetchControllerRef.current?.scheduleViewportCheck();
    },
    [latestVpRef, prefetchControllerRef, syncSiblings, userPannedTimeAxisRef],
  );

  const registerPane: RegisterPane = useCallback((handle) => {
    paneHandlesRef.current?.set(handle.paneId, handle);
    return () => paneHandlesRef.current?.delete(handle.paneId);
  }, [paneHandlesRef]);

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
        paneOrder,
      );
      if (next) {
        dragHeightsRef.current = next;
        setDragHeights(next);
      }
    },
    [subKeys, state.paneHeights, dims.height, collapsedKeys, maximizedKey, paneOrder],
  );

  const handleSeparatorResizeEnd = useCallback(() => {
    const finalHeights = dragHeightsRef.current;
    dragHeightsRef.current = null;
    setDragHeights(null);
    if (finalHeights && onPaneHeightsChange) {
      onPaneHeightsChange(finalHeights);
    }
  }, [onPaneHeightsChange]);

  const buildIndicatorLegendSections = useCallback(
    (ind: IndicatorConfig) => {
      const sections = resolveIndicatorLegend(
        ind,
        displayCandles,
        crosshairDataIndex,
        theme,
        state.chartSettings,
      );
      if (!sections) return null;
      if (indicatorHasSettings(ind.name)) {
        return appendLegendSettingsAction(sections, ind.id);
      }
      return sections;
    },
    [crosshairDataIndex, displayCandles, state.chartSettings, theme],
  );

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
  }, [chartAreaRef]);

  return {
    dims,
    layout,
    paneSegments,
    paneSegmentsRef,
    paneBoundaries,
    paneHandlesRef,
    layoutRef,
    dragHeightsRef,
    syncSiblingsRef,
    visibleIndicators,
    mainIndicators,
    hasMultiplePanes,
    registerPane,
    syncSiblings,
    handleViewport,
    handleSeparatorResize,
    handleSeparatorResizeEnd,
    buildIndicatorLegendSections,
    setDims,
  };
}
