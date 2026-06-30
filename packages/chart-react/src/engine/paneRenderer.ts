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
import {
  defaultLayerRegistry,
  LAYER_PHASE_KEY,
  type LayerDrawState,
} from './layers';
import { BackgroundLayerCache } from './layerCache';
import type { CandleWebGLRenderer } from './webgl/candleWebGL';
import type { IndicatorWebGLRenderer } from './webgl/indicatorWebGL';
import type { EventBadgeGroup } from './eventBadges';
import {
  measurePhase,
  canReuseBackgroundCache,
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
  candleWebGL: CandleWebGLRenderer | null;
  candlesUseWebGL: boolean;
  indicatorWebGL: IndicatorWebGLRenderer | null;
  indicatorsUseWebGL: boolean;
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

  ctx.ctx.clearRect(0, 0, ctx.width, ctx.height);

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
    candleWebGL: ctx.candleWebGL,
    candlesUseWebGL: ctx.candlesUseWebGL,
    indicatorWebGL: ctx.indicatorWebGL,
    indicatorsUseWebGL: ctx.indicatorsUseWebGL,
  };

  for (const layer of defaultLayerRegistry.getOrderedLayers(ctx.reasons)) {
    if (layer.shouldDraw && !layer.shouldDraw(layerState)) continue;
    const phaseKey = LAYER_PHASE_KEY[layer.id];
    phases[phaseKey] = measurePhase(() => layer.draw(layerState)).durationMs;
  }

  phases.totalMs = performance.now() - totalStart;
  return phases;
}
