import type {
  Candle,
  IndicatorConfig,
  SerializedDrawing,
  Theme,
  Interval,
  ChartEventMarker,
  ChartReferenceLine,
  ChartAnnotationChannelMarker,
} from '@edge/chart-core';
import type { ChartSettings, RequiredChartSettings } from './chartSettings';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import { BackgroundLayerCache, SeriesLayerCache } from './layerCache';
import {
  defaultLayerRegistry,
  drawSeriesLayersWithCache,
  LAYER_PHASE_KEY,
  SERIES_LAYER_IDS,
  type LayerDrawState,
} from './layers';
import type { CandleWebGLRenderer } from './webgl/candleWebGL';
import type { IndicatorWebGLRenderer } from './webgl/indicatorWebGL';
import type { EventBadgeGroup } from './eventBadges';
import type { IndicatorResultProvider } from './indicatorResultProvider';
import { resolveIndicatorResultProvider } from './indicatorResultProvider';
import {
  measurePhase,
  canReuseBackgroundCache,
  canReuseSeriesCache,
  type DrawInvalidationReason,
  type DrawPhaseTimings,
} from './renderScheduler';
import type { VisibleRange } from '@edge/chart-core';

export type PaneRendererContext = {
  ctx: CanvasRenderingContext2D;
  vp: VisibleRange;
  width: number;
  height: number;
  theme: Theme;
  candles: Candle[];
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  previewDrawing: SerializedDrawing | null;
  selectedDrawingId: string | null;
  hoveredDrawingId: string | null;
  chartType: string;
  chartSettings: RequiredChartSettings;
  interval?: Interval;
  paneId: string;
  isPricePane: boolean;
  showTimeAxis: boolean;
  effectiveShowTimeAxis: boolean;
  priceScaleSide: PriceScaleSide;
  mainSeriesVisible: boolean;
  eventMarkers: ChartEventMarker[];
  referenceLines: ChartReferenceLine[];
  annotationMarkers: ChartAnnotationChannelMarker[];
  livePrice?: number | null;
  liveMarketSession?: import('@edge/chart-core').MarketSessionKind | null;
  hoveredEventBadgeId: string | null;
  selectedEventBadgeId: string | null;
  onEventBadgeGroupsDrawn: (groups: EventBadgeGroup[]) => void;
  reasons: ReadonlySet<DrawInvalidationReason>;
  backgroundCache: BackgroundLayerCache;
  seriesCache: SeriesLayerCache;
  candleWebGL: CandleWebGLRenderer | null;
  candlesUseWebGL: boolean;
  indicatorWebGL: IndicatorWebGLRenderer | null;
  indicatorsUseWebGL: boolean;
  indicatorResultProvider?: IndicatorResultProvider | null;
  extraPriceAxisAnnotations?: import('@edge/chart-core/priceAxisTypes').PriceAxisAnnotation[];
};

/** Run ordered layer draw phases for one pane canvas. */
export function drawPaneLayers(ctx: PaneRendererContext): DrawPhaseTimings {
  const phases: DrawPhaseTimings = {
    backgroundMs: 0,
    gridMs: 0,
    candlesMs: 0,
    indicatorsMs: 0,
    drawingsMs: 0,
    axesMs: 0,
    totalMs: 0,
  };
  const totalStart = performance.now();
  const reuseBackground = canReuseBackgroundCache(ctx.reasons);
  const reuseSeries = canReuseSeriesCache(ctx.reasons);

  ctx.ctx.clearRect(0, 0, ctx.width, ctx.height);

  const indicatorResultProvider = resolveIndicatorResultProvider(ctx.indicatorResultProvider);
  const frameIndicatorSeries = indicatorResultProvider.prepareFrame(ctx.indicators, ctx.candles);

  const layerState: LayerDrawState = {
    ctx: ctx.ctx,
    vp: ctx.vp,
    width: ctx.width,
    height: ctx.height,
    theme: ctx.theme,
    candles: ctx.candles,
    indicators: ctx.indicators,
    drawings: ctx.drawings,
    previewDrawing: ctx.previewDrawing,
    selectedDrawingId: ctx.selectedDrawingId,
    hoveredDrawingId: ctx.hoveredDrawingId,
    chartType: ctx.chartType,
    chartSettings: ctx.chartSettings,
    interval: ctx.interval,
    paneId: ctx.paneId,
    isPricePane: ctx.isPricePane,
    showTimeAxis: ctx.showTimeAxis,
    effectiveShowTimeAxis: ctx.effectiveShowTimeAxis,
    priceScaleSide: ctx.priceScaleSide,
    mainSeriesVisible: ctx.mainSeriesVisible,
    eventMarkers: ctx.eventMarkers,
    referenceLines: ctx.referenceLines,
    annotationMarkers: ctx.annotationMarkers,
    livePrice: ctx.livePrice,
    liveMarketSession: ctx.liveMarketSession,
    hoveredEventBadgeId: ctx.hoveredEventBadgeId,
    selectedEventBadgeId: ctx.selectedEventBadgeId,
    onEventBadgeGroupsDrawn: ctx.onEventBadgeGroupsDrawn,
    reasons: ctx.reasons,
    backgroundCache: ctx.backgroundCache,
    reuseBackground,
    seriesCache: ctx.seriesCache,
    reuseSeries,
    candleWebGL: ctx.candleWebGL,
    candlesUseWebGL: ctx.candlesUseWebGL,
    indicatorWebGL: ctx.indicatorWebGL,
    indicatorsUseWebGL: ctx.indicatorsUseWebGL,
    indicatorResultProvider: ctx.indicatorResultProvider,
    frameIndicatorSeries,
    extraPriceAxisAnnotations: ctx.extraPriceAxisAnnotations,
  };

  let seriesDrawn = false;

  for (const layer of defaultLayerRegistry.getOrderedLayers(ctx.reasons)) {
    if (SERIES_LAYER_IDS.has(layer.id)) {
      if (!seriesDrawn) {
        const phaseKey = 'candlesMs' as const;
        phases[phaseKey] = measurePhase(() =>
          drawSeriesLayersWithCache(layerState, defaultLayerRegistry),
        ).durationMs;
        phases.indicatorsMs = 0;
        seriesDrawn = true;
      }
      continue;
    }
    if (layer.shouldDraw && !layer.shouldDraw(layerState)) continue;
    const phaseKey = LAYER_PHASE_KEY[layer.id];
    phases[phaseKey] = measurePhase(() => layer.draw(layerState)).durationMs;
  }

  phases.totalMs = performance.now() - totalStart;
  return phases;
}
