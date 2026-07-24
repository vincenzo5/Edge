import type {
  Candle,
  ChartAnnotationChannelMarker,
  ChartEventMarker,
  ChartReferenceLine,
  IndicatorConfig,
  Interval,
  SerializedDrawing,
  Theme,
  VisibleRange,
} from '@edge/chart-core';
import { DrawingRegistry } from '@edge/chart-core';
import { resolveIndicatorPlugin, resolveIndicatorResultProvider, type IndicatorResultProvider } from './indicatorResultProvider';
import { pointToPlot } from '@edge/chart-core/drawingCoords';
import { drawScriptObjects } from '@edge/chart-core';
import { drawAnnotationBadge } from '@edge/chart-core/drawings/annotationBadge';
import { drawControlPoints, sortDrawingsByZ } from '@edge/chart-core/drawings/primitives';
import { drawIndicator } from '@edge/chart-core/indicators/draw';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import type { RequiredChartSettings } from './chartSettings';
import type { BackgroundLayerCache, SeriesLayerCache } from './layerCache';
import {
  drawAxes,
  drawAnnotationMarkers,
  drawCandles,
  drawEventBadges,
  drawGrid,
  drawPlotBackground,
  drawPriceAxisAnnotations,
  drawReferenceLines,
  drawSessionRegions,
} from './renderer';
import type { EventBadgeGroup } from './eventBadges';
import type { DrawInvalidationReason, DrawPhaseTimings } from './renderScheduler';
import {
  BACKGROUND_INVALIDATING,
  SERIES_INVALIDATING,
} from './renderScheduler';
import type { CandleWebGLRenderer } from './webgl/candleWebGL';
import { isWebGLCandlesPreferred } from './webgl/candleWebGL';
import type { IndicatorWebGLRenderer } from './webgl/indicatorWebGL';
import { isWebGLIndicatorsPreferred } from './webgl/indicatorWebGL';
import { isWebGLCompatibleIndicator } from './webgl/indicatorGeometry';
import { resolveMainPaneScriptBarColors } from './scriptBarcolor';

export type ChartLayerId =
  | 'background'
  | 'grid'
  | 'candles'
  | 'indicators'
  | 'scriptObjects'
  | 'drawings'
  | 'axes';

export type LayerBackend = 'canvas' | 'webgl';

/** Shared draw context passed to each registered chart layer. */
export type LayerDrawState = {
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
  hoveredEventBadgeId?: string | null;
  selectedEventBadgeId?: string | null;
  onEventBadgeGroupsDrawn?: (groups: EventBadgeGroup[]) => void;
  reasons: ReadonlySet<DrawInvalidationReason>;
  backgroundCache: BackgroundLayerCache;
  reuseBackground: boolean;
  seriesCache: SeriesLayerCache;
  reuseSeries: boolean;
  /** When set and ready, main-pane OHLC may render via WebGL (blit into ctx). */
  candleWebGL?: CandleWebGLRenderer | null;
  /** True when WebGL candle backend is active for this pane draw. */
  candlesUseWebGL?: boolean;
  /** When set and ready, declarative indicator series may render via WebGL. */
  indicatorWebGL?: IndicatorWebGLRenderer | null;
  /** True when WebGL indicator backend is active for this pane draw. */
  indicatorsUseWebGL?: boolean;
  /** Per-chart script result provider (Phase 2). */
  indicatorResultProvider?: IndicatorResultProvider | null;
  extraPriceAxisAnnotations?: import('@edge/chart-core/priceAxisTypes').PriceAxisAnnotation[];
};

export type ChartLayer = {
  id: ChartLayerId;
  z: number;
  backend: LayerBackend;
  /** Reasons that invalidate cached content for this layer. */
  invalidatingReasons: ReadonlySet<DrawInvalidationReason>;
  shouldDraw?: (state: LayerDrawState) => boolean;
  draw: (state: LayerDrawState) => void;
};

export const LAYER_PHASE_KEY: Record<ChartLayerId, keyof Omit<DrawPhaseTimings, 'totalMs'>> = {
  background: 'backgroundMs',
  grid: 'gridMs',
  candles: 'candlesMs',
  indicators: 'indicatorsMs',
  scriptObjects: 'indicatorsMs',
  drawings: 'drawingsMs',
  axes: 'axesMs',
};

export const SERIES_LAYER_IDS: ReadonlySet<ChartLayerId> = new Set([
  'candles',
  'indicators',
  'scriptObjects',
]);

function drawSeriesLayerContent(state: LayerDrawState, registry: LayerRegistry): void {
  for (const id of ['candles', 'indicators', 'scriptObjects'] as const) {
    const layer = registry.get(id);
    if (!layer) continue;
    if (layer.shouldDraw && !layer.shouldDraw(state)) continue;
    layer.draw(state);
  }
}

/** Blit or rebuild the composite candles/indicators/scriptObjects OffscreenCanvas layer. */
export function drawSeriesLayersWithCache(
  state: LayerDrawState,
  registry: LayerRegistry,
): void {
  const { ctx, width, height, theme, seriesCache, reuseSeries } = state;

  if (reuseSeries) {
    seriesCache.blitTo(ctx, width, height);
    return;
  }

  seriesCache.invalidate();
  seriesCache.ensure(width, height, theme, (seriesCtx) => {
    drawSeriesLayerContent({ ...state, ctx: seriesCtx }, registry);
  });
  seriesCache.blitTo(ctx, width, height);
}

function drawBackgroundLayer(state: LayerDrawState): void {
  const {
    ctx,
    width,
    height,
    theme,
    chartSettings,
    effectiveShowTimeAxis,
    backgroundCache,
    reuseBackground,
  } = state;

  if (reuseBackground) {
    backgroundCache.blitTo(ctx, width, height);
    return;
  }

  backgroundCache.invalidate();
  backgroundCache.ensure(width, height, theme, chartSettings, effectiveShowTimeAxis, (bgCtx) => {
    drawPlotBackground(bgCtx, width, height, theme, chartSettings, effectiveShowTimeAxis);
  });
  backgroundCache.blitTo(ctx, width, height);
}

function drawGridLayer(state: LayerDrawState): void {
  const { ctx, vp, width, height, theme, chartSettings, candles, interval } = state;
  drawGrid(ctx, vp, width, height, theme, chartSettings, candles, interval);
}

function drawCandleOhlc(state: LayerDrawState): void {
  const {
    ctx,
    vp,
    theme,
    chartType,
    chartSettings,
    candles,
    effectiveShowTimeAxis,
    width,
    height,
    priceScaleSide,
    candleWebGL,
    candlesUseWebGL,
    indicators,
    indicatorResultProvider,
  } = state;

  if (state.isPricePane && chartSettings.symbol.sessionMode === 'extended') {
    drawSessionRegions(
      ctx,
      vp,
      candles,
      width,
      height,
      theme,
      chartSettings,
      effectiveShowTimeAxis,
    );
  }

  const usedWebGL =
    candlesUseWebGL &&
    candleWebGL?.drawInto(ctx, {
      candles,
      vp,
      theme,
      chartType,
      chartSettings,
      effectiveShowTimeAxis,
      width,
      height,
      priceScaleSide,
    });

  if (!usedWebGL) {
    const barColors = resolveMainPaneScriptBarColors(
      indicators,
      candles,
      theme,
      indicatorResultProvider,
    );
    drawCandles(
      ctx,
      candles,
      vp,
      theme,
      chartType as Parameters<typeof drawCandles>[4],
      chartSettings,
      barColors,
    );
  }
}

/** Event badges, reference lines, and annotation channel markers stay on Canvas 2D. */
function drawCandleOverlays(state: LayerDrawState): void {
  const {
    ctx,
    vp,
    candles,
    eventMarkers,
    referenceLines,
    annotationMarkers,
    theme,
    effectiveShowTimeAxis,
    hoveredEventBadgeId,
    selectedEventBadgeId,
    onEventBadgeGroupsDrawn,
  } = state;
  if (eventMarkers.length > 0) {
    const groups = drawEventBadges(
      ctx,
      vp,
      candles,
      eventMarkers,
      theme,
      effectiveShowTimeAxis,
      {
        hoveredGroupId: hoveredEventBadgeId,
        selectedGroupId: selectedEventBadgeId,
      },
    );
    onEventBadgeGroupsDrawn?.(groups);
  }
  if (referenceLines.length > 0) {
    drawReferenceLines(ctx, vp, referenceLines, theme);
  }
  if (annotationMarkers.length > 0) {
    drawAnnotationMarkers(ctx, vp, candles, annotationMarkers, theme);
  }
}

function drawCandleSeriesLayer(state: LayerDrawState): void {
  drawCandleOhlc(state);
  drawCandleOverlays(state);
}

/** Factory for the candles layer with an explicit rendering backend metadata tag. */
export function createCandlesLayer(backend: LayerBackend): ChartLayer {
  return {
    id: 'candles',
    z: 20,
    backend,
    invalidatingReasons: SERIES_INVALIDATING,
    shouldDraw: (state) => state.isPricePane && state.mainSeriesVisible,
    draw: drawCandleSeriesLayer,
  };
}

/** Swap the registry candles layer to the WebGL backend (metadata only; draw falls back to Canvas). */
export function registerWebGLCandlesLayer(registry: LayerRegistry): void {
  registry.register(createCandlesLayer('webgl'));
}

function drawIndicatorPlotsLayer(state: LayerDrawState): void {
  const {
    ctx,
    candles,
    vp,
    theme,
    indicators,
    effectiveShowTimeAxis,
    width,
    height,
    priceScaleSide,
    indicatorWebGL,
    indicatorsUseWebGL,
  } = state;

  const webglCandidates = indicators.filter((ind) => {
    if (ind.visible === false) return false;
    const plugin = resolveIndicatorPlugin(ind);
    return !!plugin && isWebGLCompatibleIndicator(plugin);
  });
  const canvasOnly = indicators.filter((ind) => {
    if (ind.visible === false) return false;
    const plugin = resolveIndicatorPlugin(ind);
    return !!plugin && !isWebGLCompatibleIndicator(plugin);
  });

  let webglDrew = false;
  if (indicatorsUseWebGL && indicatorWebGL && webglCandidates.length > 0) {
    webglDrew = indicatorWebGL.drawInto(ctx, {
      indicators: webglCandidates,
      candles,
      vp,
      theme,
      effectiveShowTimeAxis,
      width,
      height,
      priceScaleSide,
      resultProvider: state.indicatorResultProvider,
    });
  }

  const canvasIndicators = webglDrew
    ? canvasOnly
    : indicators.filter((ind) => ind.visible !== false);

  for (const ind of canvasIndicators) {
    const plugin = resolveIndicatorPlugin(ind);
    if (plugin) {
      const provider = resolveIndicatorResultProvider(state.indicatorResultProvider);
      const data = provider.resolveSeries(plugin, ind, candles);
      drawIndicator(plugin, ind, ctx, candles, vp, theme, data);
    }
  }
}

/** Factory for the indicators layer with an explicit rendering backend metadata tag. */
export function createIndicatorsLayer(backend: LayerBackend): ChartLayer {
  return {
    id: 'indicators',
    z: 30,
    backend,
    invalidatingReasons: SERIES_INVALIDATING,
    draw: drawIndicatorPlotsLayer,
  };
}

/** Swap the registry indicators layer to the WebGL backend (metadata only; draw falls back to Canvas). */
export function registerWebGLIndicatorsLayer(registry: LayerRegistry): void {
  registry.register(createIndicatorsLayer('webgl'));
}

function drawScriptObjectsLayer(state: LayerDrawState): void {
  const provider = resolveIndicatorResultProvider(state.indicatorResultProvider);
  const entries = provider.collectScriptObjectDrawEntries(state.indicators, state.candles);
  if (entries.length === 0) return;
  drawScriptObjects(state.ctx, entries, state.vp, state.candles, state.theme);
}

function drawDrawingsLayer(state: LayerDrawState): void {
  const {
    ctx,
    vp,
    theme,
    candles,
    drawings,
    previewDrawing,
    selectedDrawingId,
    hoveredDrawingId,
    showTimeAxis,
    interval,
  } = state;

  for (const d of sortDrawingsByZ(drawings)) {
    if (!d.visible) continue;
    const plugin = DrawingRegistry.get(d.name);
    if (plugin) {
      const selected = d.id === selectedDrawingId;
      plugin.draw(ctx, d, vp, theme, selected, candles, {
        hovered: Boolean(d.id && d.id === hoveredDrawingId),
        showTimeAxis,
        interval,
      });
      if (d.metadata?.kind && d.points.length > 0) {
        const anchor = pointToPlot(d.points[0]!, vp, candles, showTimeAxis);
        drawAnnotationBadge(ctx, d, anchor, theme);
      }
    }
  }

  const hoveredDrawing = drawings.find(
    (d) => d.id && d.id === hoveredDrawingId && d.id !== selectedDrawingId,
  );
  if (hoveredDrawing?.visible) {
    const plugin = DrawingRegistry.get(hoveredDrawing.name);
    const points = plugin?.getControlPoints?.(hoveredDrawing, vp, candles, showTimeAxis);
    if (points?.length) {
      drawControlPoints(ctx, points, theme, true);
    }
  }

  if (previewDrawing && previewDrawing.visible !== false) {
    const plugin = DrawingRegistry.get(previewDrawing.name);
    if (plugin) {
      plugin.draw(ctx, previewDrawing, vp, theme, false, candles, {
        preview: true,
        showTimeAxis,
        interval,
      });
      const points = plugin.getControlPoints?.(previewDrawing, vp, candles, showTimeAxis);
      if (points?.length) {
        drawControlPoints(ctx, points, theme, true);
      }
    }
  }
}

function drawAxesLabelsLayer(state: LayerDrawState): void {
  const {
    ctx,
    vp,
    width,
    height,
    theme,
    chartSettings,
    candles,
    indicators,
    drawings,
    interval,
    paneId,
    isPricePane,
    effectiveShowTimeAxis,
    priceScaleSide,
    livePrice,
  } = state;

  const axisSide: PriceScaleSide = isPricePane ? priceScaleSide : 'right';
  drawAxes(
    ctx,
    vp,
    width,
    height,
    theme,
    chartSettings,
    candles,
    interval,
    effectiveShowTimeAxis,
    chartSettings.scales.showPriceScale,
    axisSide,
  );

  if (chartSettings.scales.showPriceScale) {
    drawPriceAxisAnnotations({
      ctx,
      vp,
      width,
      height,
      theme,
      settings: chartSettings,
      paneId,
      candles,
      indicators,
      drawings,
      interval,
      showTimeAxis: effectiveShowTimeAxis,
      livePrice,
      liveMarketSession: state.liveMarketSession,
      resultProvider: state.indicatorResultProvider,
      extraPriceAxisAnnotations: state.extraPriceAxisAnnotations,
    });
  }
}

/** Default ordered chart layers for Canvas 2D rendering. */
export const STANDARD_CHART_LAYERS: readonly ChartLayer[] = [
  {
    id: 'background',
    z: 0,
    backend: 'canvas',
    invalidatingReasons: BACKGROUND_INVALIDATING,
    draw: drawBackgroundLayer,
  },
  {
    id: 'grid',
    z: 10,
    backend: 'canvas',
    invalidatingReasons: new Set(['data', 'viewport', 'size', 'theme', 'settings']),
    shouldDraw: (state) => state.chartSettings.canvas.showGrid,
    draw: drawGridLayer,
  },
  createCandlesLayer(isWebGLCandlesPreferred() ? 'webgl' : 'canvas'),
  createIndicatorsLayer(isWebGLIndicatorsPreferred() ? 'webgl' : 'canvas'),
  {
    id: 'scriptObjects',
    z: 35,
    backend: 'canvas',
    invalidatingReasons: SERIES_INVALIDATING,
    draw: drawScriptObjectsLayer,
  },
  {
    id: 'drawings',
    z: 40,
    backend: 'canvas',
    invalidatingReasons: new Set(['drawings', 'viewport', 'selection', 'data', 'size', 'theme', 'settings']),
    draw: drawDrawingsLayer,
  },
  {
    id: 'axes',
    z: 50,
    backend: 'canvas',
    invalidatingReasons: new Set(['viewport', 'settings', 'data', 'size', 'theme', 'drawings']),
    draw: drawAxesLabelsLayer,
  },
] as const;

export class LayerRegistry {
  private layers = new Map<ChartLayerId, ChartLayer>();

  constructor(layers: readonly ChartLayer[] = STANDARD_CHART_LAYERS) {
    for (const layer of layers) {
      this.register(layer);
    }
  }

  register(layer: ChartLayer): void {
    this.layers.set(layer.id, layer);
  }

  getAll(): ChartLayer[] {
    return [...this.layers.values()].sort((a, b) => a.z - b.z);
  }

  getOrderedLayers(_reasons?: ReadonlySet<DrawInvalidationReason>): ChartLayer[] {
    return this.getAll();
  }

  get(id: ChartLayerId): ChartLayer | undefined {
    return this.layers.get(id);
  }
}

export const defaultLayerRegistry = new LayerRegistry();
