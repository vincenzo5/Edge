'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import PackageEdgeChart, {
  type DrawingScreenBounds,
  type EdgeChartHandle,
  type GoToRequest,
  type GoToResult,
  type IndicatorKey,
  indicatorKey,
  parseIndicatorKey,
  legacyParseIndicatorKey,
} from '@edge/chart-react';
import type { Candle, ChartDataMeta } from '@edge/chart-core';
import type { CellConfig, Theme, TrackedOverlay, SerializedDrawing } from '@/lib/chartConfig';
import { mergeChartSettings } from '@/lib/chartConfig';
import { buildCandleSessionKey } from '@/lib/chart/rangePresetTransition';
import { cellConfigToChartState } from '@/lib/chart/stateMapping';
import {
  captureChartElement,
  SnapshotCaptureError,
  type SnapshotCaptureOptions,
} from '@/lib/chart/chartSnapshot';
import {
  defaultApiChartDataFeed,
  useChartDataFeed,
  useChartOverlays,
  type UseChartDataFeedOptions,
} from '@/lib/chartDataFeed';
import { eventKindsFromChartSettings } from '@/lib/chartDataFeed/eventOverlaySettings';
import { drawingsToAnnotationMarkers } from '@/lib/chartDataFeed/overlayMappers';
import { useAccountOptional } from './AccountProvider';
import { buildPositionReferenceLines } from '@/lib/brokerage/positionOverlays';
import ChartOverlayStatusStack from './chart-cell/ChartOverlayStatusStack';
import ChartLoadingOverlay from './chart-cell/ChartLoadingOverlay';

export { indicatorKey, parseIndicatorKey, legacyParseIndicatorKey };
export type { GoToRequest, GoToResult, DrawingScreenBounds, IndicatorKey };

export type ChartHandle = EdgeChartHandle & {
  canCaptureSnapshot: () => boolean;
  captureSnapshot: (opts?: SnapshotCaptureOptions) => Promise<Blob>;
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
  onCrosshairTimestamp?: (timestamp: number | null) => void;
  onDrawingDisarmed?: () => void;
  onDataLoaded?: (info: { count: number }) => void;
  onDataMetaChange?: (meta: ChartDataMeta | null) => void;
  onCandlesChange?: (candles: Candle[]) => void;
  onCrosshairMove?: (ev: {
    timestamp: number | null;
    dataIndex: number | null;
    valueLabel: string | null;
    plotX?: number | null;
  }) => void;
  onLegendAction?: (actionId: string) => void;
  compact?: boolean;
  suppressCrosshair?: boolean;
  livePrice?: number | null;
  liveMarketSession?: import('@edge/chart-core').MarketSessionKind | null;
  marketSessionLabel?: string | null;
  feed?: UseChartDataFeedOptions['feed'];
  /** Bump to refetch candles without changing symbol/range/interval. */
  reloadKey?: number;
  /** Bump feed reload (e.g. after chart error boundary or status badge retry). */
  onRetry?: () => void;
  /** Optional second-line legend content (e.g. market context breadcrumb). */
  legendContextSlot?: ReactNode;
  /** Optional content rendered before the OHLCV sections on the top legend line (e.g. symbol nav arrows). */
  legendLeadingSlot?: ReactNode;
  /** Show app-wide Data Health overlay badge (active chart cell only). */
  showDataHealthBadge?: boolean;
};

const EdgeChart = forwardRef<ChartHandle, Props>(function EdgeChart(props, ref) {
  const {
    config,
    theme,
    visibleCount = null,
    chartId,
    onConfigChange,
    onDataLoaded,
    onDataMetaChange,
    onCandlesChange,
    collapsedKeys,
    maximizedKey,
    paneOrder,
    feed = defaultApiChartDataFeed,
    reloadKey = 0,
    onRetry,
    livePrice = null,
    liveMarketSession = null,
    marketSessionLabel = null,
    showDataHealthBadge = false,
    ...rest
  } = props;

  const sessionMode = config.chartSettings?.symbol?.sessionMode ?? 'regular';

  const innerRef = useRef<EdgeChartHandle>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const {
    candles,
    loading,
    error,
    meta,
    loadMore,
    refreshing,
    stale,
    streamError,
  } = useChartDataFeed({
    feed,
    symbol: config.symbol,
    exchange: config.exchange,
    interval: config.interval,
    range: config.range,
    sessionMode,
    reloadKey,
  });

  const localAnnotations = useMemo(
    () => drawingsToAnnotationMarkers(config.drawings, candles),
    [config.drawings, candles],
  );
  const eventKinds = useMemo(
    () => eventKindsFromChartSettings(config.chartSettings, config.symbol),
    [config.chartSettings, config.symbol],
  );

  const overlayState = useChartOverlays({
    feed,
    symbol: config.symbol,
    enabled: !loading && candles.length > 0,
    localAnnotations,
    eventKinds,
  });

  const account = useAccountOptional();
  const chartSettingsMerged = useMemo(
    () => mergeChartSettings(config.chartSettings),
    [config.chartSettings],
  );
  const positionReferenceLines = useMemo(() => {
    if (!chartSettingsMerged.trading.showPositions || !account) return [];
    const position = account.positionForSymbol(config.symbol);
    return buildPositionReferenceLines(position);
  }, [account, chartSettingsMerged.trading.showPositions, config.symbol]);

  const mergedReferenceLines = useMemo(
    () => [...overlayState.referenceLines, ...positionReferenceLines],
    [overlayState.referenceLines, positionReferenceLines],
  );

  const baseCandlesRef = useRef<Candle[]>([]);
  baseCandlesRef.current = candles;

  const chartState = useMemo(() => cellConfigToChartState(config), [config]);
  const sessionKey = useMemo(
    () => buildCandleSessionKey(config.symbol, config.range, config.interval),
    [config.symbol, config.range, config.interval],
  );

  useEffect(() => {
    if (candles.length > 0) {
      onDataLoaded?.({ count: candles.length });
    }
  }, [candles.length, onDataLoaded]);

  useEffect(() => {
    onDataMetaChange?.(meta);
  }, [meta, onDataMetaChange]);

  const handleCandlesChange = useCallback(
    (nextCandles: Candle[]) => {
      const base = baseCandlesRef.current;
      if (
        nextCandles.length > base.length ||
        (nextCandles.length > 0 && base.length > 0 && nextCandles[0]?.t !== base[0]?.t)
      ) {
        baseCandlesRef.current = nextCandles;
      }
      onCandlesChange?.(nextCandles);
    },
    [onCandlesChange],
  );

  const handleLoadOlderCandles = useCallback(
    async (beforeTimestampMs: number) => loadMore(beforeTimestampMs),
    [loadMore],
  );

  const handleRangePresetClear = useCallback(() => {
    const cfg = configRef.current;
    if (cfg.rangePreset != null) {
      onConfigChange?.({ ...cfg, rangePreset: null });
    }
  }, [onConfigChange]);

  useImperativeHandle(
    ref,
    () => ({
      resize: () => innerRef.current?.resize(),
      getState: () => innerRef.current?.getState() ?? cellConfigToChartState(configRef.current),
      setState: (state) => innerRef.current?.setState(state),
      startDrawing: (name) => innerRef.current?.startDrawing(name),
      stopDrawing: () => innerRef.current?.stopDrawing(),
      clearDrawings: () => innerRef.current?.clearDrawings(),
      setMagnet: (on) => innerRef.current?.setMagnet(on),
      serializeDrawings: () => innerRef.current?.serializeDrawings() ?? [],
      restoreDrawings: (data) => innerRef.current?.restoreDrawings(data),
      getVisibleRange: () => innerRef.current?.getVisibleRange() ?? null,
      setVisibleRange: (start, end) => innerRef.current?.setVisibleRange(start, end),
      onCrosshair: (cb) => innerRef.current?.onCrosshair(cb) ?? (() => {}),
      setCrosshairFromSync: (ts) => innerRef.current?.setCrosshairFromSync(ts),
      getTrackedOverlays: () => innerRef.current?.getTrackedOverlays() ?? [],
      removeOverlay: (id) => innerRef.current?.removeOverlay(id),
      setOverlayVisible: (id, visible) => innerRef.current?.setOverlayVisible(id, visible),
      setOverlayLocked: (id, locked) => innerRef.current?.setOverlayLocked(id, locked),
      renameOverlay: (id, label) => innerRef.current?.renameOverlay(id, label),
      duplicateOverlay: (id) => innerRef.current?.duplicateOverlay(id) ?? null,
      pasteDrawings: (items, anchor) => innerRef.current?.pasteDrawings(items, anchor) ?? [],
      bringForward: (id) => innerRef.current?.bringForward(id),
      sendBackward: (id) => innerRef.current?.sendBackward(id),
      subscribeOverlayChange: (cb) => innerRef.current?.subscribeOverlayChange(cb) ?? (() => {}),
      getSubPaneId: (key) => innerRef.current?.getSubPaneId(key),
      applyPaneHeights: (heights) => innerRef.current?.applyPaneHeights(heights),
      resetChartView: () => innerRef.current?.resetChartView(),
      resetPriceScaleWindow: (settingsOverride) =>
        innerRef.current?.resetPriceScaleWindow(settingsOverride),
      isViewportModified: () => innerRef.current?.isViewportModified() ?? false,
      getSelectedDrawingId: () => innerRef.current?.getSelectedDrawingId() ?? null,
      selectDrawing: (id) => innerRef.current?.selectDrawing(id),
      onSelectionChange: (cb) => innerRef.current?.onSelectionChange(cb) ?? (() => {}),
      getMagnetEnabled: () => innerRef.current?.getMagnetEnabled() ?? false,
      setKeepDrawingMode: (on) => innerRef.current?.setKeepDrawingMode(on),
      getKeepDrawingMode: () => innerRef.current?.getKeepDrawingMode() ?? false,
      zoomIn: () => innerRef.current?.zoomIn(),
      lockAllDrawings: (locked) => innerRef.current?.lockAllDrawings(locked),
      areAllDrawingsLocked: () => innerRef.current?.areAllDrawingsLocked() ?? false,
      setAllDrawingsVisible: (visible) => innerRef.current?.setAllDrawingsVisible(visible),
      areAllDrawingsHidden: () => innerRef.current?.areAllDrawingsHidden() ?? false,
      updateDrawingStyles: (id, patch) => innerRef.current?.updateDrawingStyles(id, patch),
      updateDrawingMetadata: (id, patch) => innerRef.current?.updateDrawingMetadata(id, patch),
      undo: () => innerRef.current?.undo() ?? false,
      redo: () => innerRef.current?.redo() ?? false,
      canUndo: () => innerRef.current?.canUndo() ?? false,
      canRedo: () => innerRef.current?.canRedo() ?? false,
      getRawCandleCount: () => innerRef.current?.getRawCandleCount() ?? 0,
      getCandles: () => innerRef.current?.getCandles() ?? [],
      goTo: (req) =>
        innerRef.current?.goTo(req) ?? Promise.resolve({ ok: false as const, reason: 'no_data' as const }),
      getLastCandleTimestamp: () => innerRef.current?.getLastCandleTimestamp() ?? null,
      getDrawingScreenBounds: (id) => innerRef.current?.getDrawingScreenBounds(id) ?? null,
      getLastDrawPhases: () => innerRef.current?.getLastDrawPhases?.() ?? null,
      canCaptureSnapshot: () =>
        !!chartAreaRef.current && baseCandlesRef.current.length > 0 && !loading,
      captureSnapshot: async (opts) => {
        const el = chartAreaRef.current;
        if (!el || baseCandlesRef.current.length === 0 || loading) {
          throw new SnapshotCaptureError('no_data');
        }
        return captureChartElement(el, {
          ...opts,
          candleCount: innerRef.current?.getRawCandleCount() ?? baseCandlesRef.current.length,
        });
      },
    }),
    [loading],
  );

  return (
    <div ref={chartAreaRef} className="relative flex min-h-0 w-full flex-1 flex-col">
      <ChartOverlayStatusStack
        theme={theme}
        showDataHealth={showDataHealthBadge}
        error={error}
        streamError={streamError}
        stale={stale}
        refreshing={refreshing}
        source={meta?.source}
        onRetry={onRetry}
        showRetry={!!error && candles.length === 0}
      />
      {loading && candles.length === 0 && !error ? (
        <ChartLoadingOverlay
          symbol={config.symbol}
          interval={config.interval}
          range={config.range}
        />
      ) : null}
      <PackageEdgeChart
        ref={innerRef}
        chartId={chartId}
        candles={candles}
        state={chartState}
        theme={theme}
        visibleCount={visibleCount}
        loading={loading}
        error={error}
        symbol={config.symbol}
        symbolName={config.symbolName}
        exchange={config.exchange}
        livePrice={livePrice}
        liveMarketSession={liveMarketSession}
        marketSessionLabel={marketSessionLabel}
        interval={config.interval}
        range={config.range}
        rangePreset={config.rangePreset ?? null}
        sessionKey={sessionKey}
        collapsedKeys={collapsedKeys}
        maximizedKey={maximizedKey}
        paneOrder={paneOrder}
        onLoadOlderCandles={handleLoadOlderCandles}
        onRangePresetClear={handleRangePresetClear}
        onCandlesChange={handleCandlesChange}
        eventMarkers={overlayState.events}
        referenceLines={mergedReferenceLines}
        annotationMarkers={overlayState.annotations}
        {...rest}
      />
    </div>
  );
});

export default EdgeChart;
