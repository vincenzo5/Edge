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
import type { Candle, ChartDataMeta, ChartAnnotationChannelMarker } from '@edge/chart-core';
import type { CellConfig, Theme, TrackedOverlay, SerializedDrawing } from '@/lib/chartConfig';
import { DEFAULT_PALETTE, type PaletteId } from '@/lib/design-system/palettes';
import { mergeChartSettings } from '@/lib/chartConfig';
import type { ChartTimeZone } from '@edge/chart-core/timeZone';
import { isChartMetaDisplayFresh } from '@/lib/marketData/trust/dataTrust';
import { buildCandleSessionKey } from '@edge/chart-react/engine/rangePresetTransition';
import { resolveCellFetchRange } from '@edge/chart-react/engine/rangeInterval';
import { cellConfigToChartState } from '@/lib/chart/stateMapping';
import {
  captureChartElement,
  SnapshotCaptureError,
  waitFrames,
  type SnapshotCaptureOptions,
} from '@/lib/chart/chartSnapshot';
import {
  defaultApiChartDataFeed,
  useChartDataFeed,
  useChartOverlays,
  type UseChartDataFeedOptions,
} from '@/lib/chartDataFeed';
import { createChartScriptSeriesResolver } from '@/lib/chart/scriptSeriesResolver';
import { eventKindsFromChartSettings } from '@/lib/chartDataFeed/eventOverlaySettings';
import { drawingsToAnnotationMarkers, mergeAnnotationMarkers } from '@/lib/chartDataFeed/overlayMappers';
import { useAccountPositionForSymbol } from "../AccountProvider";
import { buildPositionReferenceLines } from '@/lib/brokerage/positionOverlays';
import { buildMarginCallReferenceLines } from '@/lib/brokerage/marginCallOverlays';
import { useSidebarOptional } from '../SidebarContext';
import { useRiskSettingsOptional } from '../RiskSettingsProvider';
import { useRiskLiquidationOverlayOptional } from '../risk/RiskLiquidationOverlayContext';
import ChartOverlayStatusStack from './ChartOverlayStatusStack';
import ChartLoadingOverlay from './ChartLoadingOverlay';
import { useScriptAlertSnapshotBridge } from '@/lib/alerts/useScriptAlertSnapshotBridge';

export { indicatorKey, parseIndicatorKey, legacyParseIndicatorKey };
export type { GoToRequest, GoToResult, DrawingScreenBounds, IndicatorKey };

export type ChartHandle = EdgeChartHandle & {
  canCaptureSnapshot: () => boolean;
  captureSnapshot: (opts?: SnapshotCaptureOptions) => Promise<Blob>;
};

type Props = {
  config: CellConfig;
  drawingsRevision?: number;
  theme: Theme;
  palette?: PaletteId;
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
  scriptSourceResolver?: import("@edge/chart-core").ScriptSourceResolver | null;
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
  /** Transient journal execution markers (not persisted as drawings). */
  journalAnnotationMarkers?: ChartAnnotationChannelMarker[];
  /** App default timezone — charts inherit when per-chart setting is unset. */
  defaultTimeZone?: ChartTimeZone;
  /** Fired after price-pane viewport mutations (pan/zoom/scale/restore). */
  onViewportChange?: () => void;
  /** Enable live candle subscription when the feed supports it. Default true. */
  live?: boolean;
  extraPriceAxisAnnotations?: import("@edge/chart-core/priceAxisTypes").PriceAxisAnnotation[];
};

const EdgeChart = forwardRef<ChartHandle, Props>(function EdgeChart(props, ref) {
  const {
    config,
    drawingsRevision,
    theme,
    palette = DEFAULT_PALETTE,
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
    journalAnnotationMarkers = [],
    defaultTimeZone,
    live = true,
    ...rest
  } = props;

  const sessionMode = config.chartSettings?.symbol?.sessionMode ?? 'regular';

  const innerRef = useRef<EdgeChartHandle>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const fetchRange = useMemo(
    () => resolveCellFetchRange(config),
    [config.range, config.interval, config.rangePreset],
  );

  const {
    candles,
    seriesIdentity,
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
    range: fetchRange,
    sessionMode,
    reloadKey,
    live,
  });

  const displayStale = useMemo(() => {
    if (error || refreshing || streamError) return false;
    if (!meta) return stale;
    return !isChartMetaDisplayFresh(meta) && stale;
  }, [meta, stale, streamError, error, refreshing]);

  const localAnnotations = useMemo(
    () =>
      mergeAnnotationMarkers(
        drawingsToAnnotationMarkers(config.drawings, candles),
        journalAnnotationMarkers,
      ),
    [config.drawings, candles, journalAnnotationMarkers],
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

  const chartSettingsMerged = useMemo(
    () => mergeChartSettings(config.chartSettings, { defaultTimeZone }),
    [config.chartSettings, defaultTimeZone],
  );

  const position = useAccountPositionForSymbol(
    chartSettingsMerged.trading.showPositions ? config.symbol : null,
  );
  const positionReferenceLines = useMemo(() => {
    return buildPositionReferenceLines(position);
  }, [position]);

  const sidebar = useSidebarOptional();
  const riskSettings = useRiskSettingsOptional();
  const liquidationOverlay = useRiskLiquidationOverlayOptional();

  const marginCallReferenceLines = useMemo(() => {
    if (sidebar?.activePanel !== 'settings') return [];
    if (riskSettings?.settings.showLiquidationLine !== true) return [];
    if (liquidationOverlay == null) return [];
    return buildMarginCallReferenceLines(
      liquidationOverlay.price,
      liquidationOverlay.verdict,
    );
  }, [
    sidebar?.activePanel,
    riskSettings?.settings.showLiquidationLine,
    liquidationOverlay,
  ]);

  const mergedReferenceLines = useMemo(
    () => [
      ...overlayState.referenceLines,
      ...positionReferenceLines,
      ...marginCallReferenceLines,
    ],
    [overlayState.referenceLines, positionReferenceLines, marginCallReferenceLines],
  );

  const baseCandlesRef = useRef<Candle[]>([]);
  baseCandlesRef.current = candles;

  const chartState = useMemo(() => cellConfigToChartState(config), [config]);
  const sessionKey = useMemo(
    () => buildCandleSessionKey(config.symbol, fetchRange, config.interval),
    [config.symbol, fetchRange, config.interval],
  );

  const scriptSeriesContext = useMemo(
    () => ({
      symbol: config.symbol,
      interval: config.interval,
      range: fetchRange,
      sessionMode,
    }),
    [config.symbol, config.interval, fetchRange, sessionMode],
  );

  const scriptSeriesResolver = useMemo(
    () => createChartScriptSeriesResolver(feed),
    [feed],
  );

  const handleScriptResultReady = useScriptAlertSnapshotBridge(config.symbol);

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
      getDrawingRevision: () => innerRef.current?.getDrawingRevision?.() ?? 0,
      restoreDrawings: (data) => innerRef.current?.restoreDrawings(data),
      getVisibleRange: () => innerRef.current?.getVisibleRange() ?? null,
      setVisibleRange: (start, end) => innerRef.current?.setVisibleRange(start, end),
      applyViewportSnapshot: (snapshot) =>
        innerRef.current?.applyViewportSnapshot(snapshot) ?? false,
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
          afterPrepare: async () => {
            await opts?.afterPrepare?.();
            innerRef.current?.resize();
            await waitFrames(2);
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, 120);
            });
          },
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
        marketSessionLabel={marketSessionLabel}
        showMarketStatus={config.chartSettings?.statusLine?.showMarketStatus !== false}
        error={error}
        streamError={streamError}
        stale={displayStale}
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
        palette={palette}
        visibleCount={visibleCount}
        loading={loading}
        error={error}
        symbol={config.symbol}
        symbolName={config.symbolName}
        exchange={config.exchange}
        livePrice={livePrice}
        liveMarketSession={liveMarketSession}
        marketSessionLabel={showDataHealthBadge ? null : marketSessionLabel}
        interval={config.interval}
        range={fetchRange}
        rangePreset={config.rangePreset ?? null}
        sessionKey={sessionKey}
        drawingsRevision={drawingsRevision}
        collapsedKeys={collapsedKeys}
        maximizedKey={maximizedKey}
        paneOrder={paneOrder}
        defaultTimeZone={defaultTimeZone}
        onLoadOlderCandles={handleLoadOlderCandles}
        onRangePresetClear={handleRangePresetClear}
        onCandlesChange={handleCandlesChange}
        eventMarkers={overlayState.events}
        referenceLines={mergedReferenceLines}
        annotationMarkers={overlayState.annotations}
        seriesContext={scriptSeriesContext}
        seriesResolver={scriptSeriesResolver}
        seriesIdentity={seriesIdentity}
        onScriptResultReady={handleScriptResultReady}
        {...rest}
      />
    </div>
  );
});

export default EdgeChart;
