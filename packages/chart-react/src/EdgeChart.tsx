'use client';

import {
  forwardRef,
  Fragment,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { PRICE_PANE_KEY } from '@edge/chart-core';
import type { Pane } from '@edge/chart-core/panes';
import { PANE_SEPARATOR_HEIGHT } from '@edge/chart-core/panes';
import type { VisibleRange, PaneSegment } from '@edge/chart-core';
import ChartCanvas from './engine/canvas';
import { EMPTY_DRAWINGS } from './engine/stableEmptyProps';
import CrosshairOverlay from './engine/CrosshairOverlay';
import { mergeChartSettings, resolvePriceScaleSide } from './engine/chartSettings';
import type { IndicatorConfig } from '@edge/chart-core';
import ChartLegendBar from './components/ChartLegendBar';
import PaneLegendBar from './components/PaneLegendBar';
import PaneSeparators from './components/PaneSeparators';
import PaneControlBar from './components/PaneControlBar';
import type { HistoryPrefetchController } from './engine/historyPrefetchController';
import type { ChartPaneHandle } from './engine/paneHandle';
import type { EdgeChartProps, EdgeChartHandle } from './types';
import { useDrawingController } from './drawing/useDrawingController';
import { createEdgeChartHandle } from './createEdgeChartHandle';
import { indicatorKey } from './indicatorKey';
import EventDetailCard from './components/EventDetailCard';
import HistoryNavigatorOverlay, {
  type HistoryNavigatorOverlayHandle,
} from './components/HistoryNavigatorOverlay';
import { useCandleSession } from './useCandleSession';
import { useCrosshairCoordinator } from './useCrosshairCoordinator';
import { useHistoryNavigatorCoordinator } from './useHistoryNavigatorCoordinator';
import { useChartWheelPinch } from './useChartWheelPinch';
import { usePaneLayoutController } from './usePaneLayoutController';
import { useEventDetailController } from './useEventDetailController';
import { useScriptResultCoordinator } from './useScriptResultCoordinator';

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
    palette,
    visibleCount = null,
    loading = false,
    error = null,
    symbol = '',
    symbolName,
    exchange,
    livePrice = null,
    liveMarketSession = null,
    marketSessionLabel = null,
    legendContextSlot,
    legendLeadingSlot,
    interval = '1d',
    range = '1y',
    rangePreset = null,
    sessionKey: sessionKeyProp,
    chartId,
    onStateChange,
    onLoadOlderCandles,
    onRangePresetClear,
    onOverlayRightClick,
    onDrawingOpenSettings,
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
    eventMarkers = [],
    referenceLines = [],
    annotationMarkers = [],
    extraPriceAxisAnnotations = [],
    suppressCrosshair: suppressCrosshairProp = false,
    selectedEventBadgeId: selectedEventBadgeIdProp = null,
    onEventBadgeClick,
    onEventBadgeHover,
    onEventBadgeMore,
    onViewportChange,
    historyExtent = null,
    hasMoreHistory = true,
    showHistoryNavigator = true,
    scriptSourceResolver,
    seriesContext,
    seriesResolver,
    seriesIdentity,
    onScriptResultReady,
  } = props;

  const onCrosshairTimestampRef = useRef(onCrosshairTimestamp);
  onCrosshairTimestampRef.current = onCrosshairTimestamp;

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const onLegendActionRef = useRef(onLegendAction);
  onLegendActionRef.current = onLegendAction;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const chartAreaRef = useRef<HTMLDivElement>(null);
  const paneHandlesRef = useRef<Map<string, ChartPaneHandle>>(new Map());
  const latestVpRef = useRef<VisibleRange | null>(null);
  const prefetchControllerRef = useRef<HistoryPrefetchController | null>(null);
  const overlayChangeCbsRef = useRef<Set<() => void>>(new Set());
  const wheelingRef = useRef(false);
  const historyNavigatorRef = useRef<HistoryNavigatorOverlayHandle | null>(null);
  const syncSiblingsRef = useRef<(startIndex: number, endIndex: number, sourcePaneId: string) => void>(
    () => {},
  );
  const paneSegmentsRef = useRef<PaneSegment[]>([]);

  const syncSiblings = useCallback((startIndex: number, endIndex: number, sourcePaneId: string) => {
    paneHandlesRef.current.forEach((handle, id) => {
      if (id !== sourcePaneId) handle.syncTimeWindow(startIndex, endIndex);
    });
  }, []);
  syncSiblingsRef.current = syncSiblings;

  const candleSession = useCandleSession({
    candlesProp,
    state,
    symbol,
    range,
    interval,
    sessionKeyProp,
    visibleCount,
    loading,
    rangePreset,
    onCandlesChange,
    onLoadOlderCandles,
    onRangePresetClear,
    hasMoreHistory,
    paneHandlesRef,
    latestVpRef,
    syncSiblingsRef,
    syncSiblings,
    prefetchControllerRef,
  });

  const {
    displayCandles,
    candleSessionKey,
    viewportRevision,
    displayInterval,
    candlesRef,
    baseCandlesRef,
    stateRef,
    intervalRef,
    userPannedTimeAxisRef,
    goToImplRef,
    markUserTimePan,
  } = candleSession;

  const scriptSessionKey = sessionKeyProp ?? candleSessionKey ?? chartId ?? 'edge-chart';
  const { provider: scriptResultProvider } = useScriptResultCoordinator({
    sessionKey: scriptSessionKey,
    indicators: state.indicators,
    candles: displayCandles,
    scriptSourceResolver,
    seriesContext: seriesContext ?? null,
    seriesResolver: seriesResolver ?? null,
    seriesIdentity,
    onScriptResultReady,
  });

  const crosshairCoordinator = useCrosshairCoordinator({
    candlesRef,
    paneHandlesRef,
    paneSegmentsRef,
    latestVpRef,
    stateRef,
    intervalRef,
    wheelingRef,
    onCrosshairTimestampRef,
    onCrosshairMoveRef,
  });

  const { crosshair, crosshairCbsRef, applyCrosshairFromSync, handleCrosshairMove } =
    crosshairCoordinator;

  const paneLayout = usePaneLayoutController({
    state,
    theme,
    displayCandles,
    crosshairDataIndex: crosshair?.dataIndex ?? null,
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
    indicatorResultProvider: scriptResultProvider,
  });

  const drawing = useDrawingController({
    paneHandlesRef,
    candlesRef,
    latestVpRef,
    paneSegmentsRef: paneLayout.paneSegmentsRef,
    stateRef,
    overlayChangeCbsRef,
    onDrawingDisarmed,
    onOverlayRightClick,
    onDrawingOpenSettings,
    loading,
    error,
    displayCandlesLength: displayCandles.length,
    stateDrawings: state.drawings,
    stateDrawingsRevision: props.drawingsRevision,
    livePrice,
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

  useChartWheelPinch(
    {
      chartAreaRef,
      paneHandlesRef,
      syncSiblings: paneLayout.syncSiblings,
      userPannedTimeAxisRef,
      prefetchControllerRef,
      drawingFsmRef,
    },
    wheelingRef,
  );

  const {
    dims,
    layout,
    paneBoundaries,
    visibleIndicators,
    mainIndicators,
    hasMultiplePanes,
    registerPane,
    handleViewport: handleViewportBase,
    handleSeparatorResize,
    handleSeparatorResizeEnd,
    buildIndicatorLegendSections,
    dragHeightsRef,
    setDims,
  } = paneLayout;

  syncSiblingsRef.current = paneLayout.syncSiblings;

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
    [
      applyCrosshairFromSync,
      baseCandlesRef,
      candlesRef,
      crosshairCbsRef,
      dragHeightsRef,
      drawingHandleSlice,
      goToImplRef,
      hydrateDrawings,
      setDims,
      stateRef,
    ],
  );

  const eventDetail = useEventDetailController({
    symbol,
    candleSessionKey,
    selectedEventBadgeIdProp,
    onEventBadgeClick,
    onEventBadgeHover,
    onEventBadgeMore,
  });

  const handleLegendAction = useCallback((actionId: string) => {
    onLegendActionRef.current?.(actionId);
  }, []);

  const suppressCrosshair = hideCrosshair || suppressCrosshairProp;
  const defaultTimeZone = props.defaultTimeZone;
  const chartSettings = useMemo(
    () => mergeChartSettings(state.chartSettings, { defaultTimeZone }),
    [state.chartSettings, defaultTimeZone],
  );
  const showCrosshairOverlay = chartSettings.canvas.showCrosshair && !suppressCrosshair;

  const priceScaleSide = resolvePriceScaleSide(chartSettings.scales.priceScalePlacement);

  const historyNavigator = useHistoryNavigatorCoordinator({
    enabled: showHistoryNavigator,
    historyExtent,
    candles: displayCandles,
    width: dims.width,
    priceScaleSide,
    viewportRevision,
    latestVpRef,
    wheelingRef,
    overlayRef: historyNavigatorRef,
  });
  const onHistoryNavigatorViewportChange = historyNavigator.onViewportChange;

  const handleViewport = useCallback(
    (vp: VisibleRange, paneId: string) => {
      handleViewportBase(vp, paneId);
      if (paneId === 'price') {
        onHistoryNavigatorViewportChange(vp);
        onViewportChangeRef.current?.();
      }
    },
    [handleViewportBase, onHistoryNavigatorViewportChange],
  );

  const subIndicatorByPaneKey = useMemo(() => {
    const map = new Map<string, IndicatorConfig[]>();
    for (const ind of visibleIndicators) {
      map.set(indicatorKey(ind), [ind]);
    }
    return map;
  }, [visibleIndicators]);

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
                        marketSessionLabel={marketSessionLabel}
                        livePrice={livePrice}
                        compact={pane.isCollapsed}
                        contextSlot={pane.isCollapsed ? undefined : legendContextSlot}
                        leadingSlot={pane.isCollapsed ? undefined : legendLeadingSlot}
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
                            style={{ top: `${32 + idx * 22}px` }}
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
                    palette={palette}
                    visibleCount={visibleCount}
                    width={dims.width}
                    height={pane.height}
                    drawings={paneDrawingsMap.get('price') ?? EMPTY_DRAWINGS}
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
                    extraPriceAxisAnnotations={extraPriceAxisAnnotations}
                    livePrice={livePrice}
                    liveMarketSession={liveMarketSession}
                    selectedEventBadgeId={eventDetail.effectiveSelectedEventBadgeId}
                    onEventBadgeClick={eventDetail.handleEventBadgeClick}
                    onEventBadgeHover={eventDetail.handleEventBadgeHover}
                    indicatorResultProvider={scriptResultProvider}
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
                  palette={palette}
                  visibleCount={visibleCount}
                  width={dims.width}
                  height={pane.height}
                  drawings={paneDrawingsMap.get(pane.key) ?? EMPTY_DRAWINGS}
                  previewDrawing={previewForPane(pane.key)}
                  selectedDrawingId={selectedDrawingId}
                  drawingMode={drawingMode}
                  suppressCrosshair={suppressCrosshair}
                  chartSettings={chartSettings}
                  onDrawingPointer={handleDrawingPointer}
                  onDrawingContextMenu={handleDrawingContextMenu}
                  indicators={subIndicatorByPaneKey.get(pane.key) ?? [subInd]}
                  registerPane={registerPane}
                  wheelingRef={wheelingRef}
                  interval={displayInterval}
                  showTimeAxis={showTimeAxis}
                  activeTool={activeTool}
                  onCrosshairMove={handleCrosshairMove}
                  onViewportChange={handleViewport}
                  indicatorResultProvider={scriptResultProvider}
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

      {showHistoryNavigator && (
        <HistoryNavigatorOverlay
          ref={historyNavigatorRef}
          width={dims.width}
          height={dims.height}
        />
      )}

      {!onEventBadgeClick && (
        <EventDetailCard
          open={eventDetail.eventDetailGroup != null}
          group={eventDetail.eventDetailGroup}
          anchor={eventDetail.eventDetailAnchor}
          theme={theme}
          chartBounds={chartAreaRef.current?.getBoundingClientRect() ?? null}
          interval={displayInterval}
          onClose={eventDetail.handleEventDetailClose}
          onMoreEvents={onEventBadgeMore ? eventDetail.handleEventBadgeMore : undefined}
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
