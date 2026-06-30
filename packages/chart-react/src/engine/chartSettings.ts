/** Per-cell chart display settings (TradingView Settings dialog subset). */

import type { Theme } from '@edge/chart-core';
import type { MarketSessionMode } from '@edge/chart-core';
import type { CrosshairMode } from '@edge/chart-core/crosshairMode';
import type { PriceScaleType } from '@edge/chart-core/priceScaleTransform';
import { getChartColors } from './chartTheme';
import {
  DEFAULT_CHART_TIMEZONE,
  normalizeChartTimeZone,
  type ChartTimeZone,
} from '@edge/chart-core/timeZone';

export type { ChartTimeZone } from '@edge/chart-core/timeZone';
export { DEFAULT_CHART_TIMEZONE } from '@edge/chart-core/timeZone';

export type { CrosshairMode } from '@edge/chart-core/crosshairMode';
export type { PriceScaleType } from '@edge/chart-core/priceScaleTransform';

export type SymbolPriceLabelMode = 'hidden' | 'value' | 'line' | 'valueLine';
export type IndicatorPriceLabelMode = 'hidden' | 'nameValue' | 'valueOnly';
export type DrawingPriceLabelMode = 'hidden' | 'visible';
export type PriceScalePlacement = 'auto' | 'right' | 'left';
export type MarketLabelMode = 'hidden' | 'value' | 'valueLine';
export type StatusLineTitleMode = 'name' | 'symbol' | 'description';
export type ChartLineStyle = 'solid' | 'dashed' | 'dotted';
export type GridLineMode = 'both' | 'vertical' | 'horizontal' | 'none';
export type ButtonVisibility = 'always' | 'hover' | 'hidden';
export type WatermarkMode = 'symbol' | 'replay';
export type PricePrecision = 'default' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type SymbolStyleSettings = {
  bodyUpColor?: string | null;
  bodyDownColor?: string | null;
  borderUpColor?: string | null;
  borderDownColor?: string | null;
  wickUpColor?: string | null;
  wickDownColor?: string | null;
  showBody?: boolean;
  showBorders?: boolean;
  showWicks?: boolean;
  colorBarsByPreviousClose?: boolean;
  precision?: PricePrecision;
  timeZone?: ChartTimeZone;
  /** Regular-hours candles only vs include pre/post-market intraday bars. */
  sessionMode?: MarketSessionMode;
};

export type StatusLineSettings = {
  showLogo?: boolean;
  showTitle?: boolean;
  titleMode?: StatusLineTitleMode;
  showMarketStatus?: boolean;
  showChartValues?: boolean;
  showBarChangeValues?: boolean;
  showVolume?: boolean;
  showLastDayChange?: boolean;
  indicatorShowTitles?: boolean;
  indicatorShowInputs?: boolean;
  indicatorShowValues?: boolean;
  indicatorBackgroundOpacity?: number;
};

export type ScaleSettings = {
  showPriceScale?: boolean;
  showTimeScale?: boolean;
  priceScaleType?: PriceScaleType;
  priceScalePlacement?: PriceScalePlacement;
  invertPriceScale?: boolean;
  scalePriceChartOnly?: boolean;
  noOverlappingPriceLabels?: boolean;
  showPricePlusButton?: boolean;
  showCountdownToBarClose?: boolean;
  symbolPriceLabelMode?: SymbolPriceLabelMode;
  indicatorPriceLabelMode?: IndicatorPriceLabelMode;
  drawingPriceLabels?: DrawingPriceLabelMode;
  highLowLabelMode?: MarketLabelMode;
  bidAskLabelMode?: MarketLabelMode;
  prePostMarketLabelMode?: MarketLabelMode;
  axisTextColor?: string | null;
  axisTextSize?: number;
  axisLineColor?: string | null;
};

export type CanvasSettings = {
  backgroundColor?: string | null;
  showGrid?: boolean;
  gridMode?: GridLineMode;
  gridColor?: string | null;
  gridLineStyle?: ChartLineStyle;
  gridOpacity?: number;
  showCrosshair?: boolean;
  crosshairMode?: CrosshairMode;
  /** When true, crosshair X freezes at `lockedCrosshairPlotX` until unlocked. */
  lockCrosshairToTime?: boolean;
  lockedCrosshairPlotX?: number | null;
  crosshairColor?: string | null;
  crosshairLineStyle?: ChartLineStyle;
  watermarkVisible?: boolean;
  watermarkMode?: WatermarkMode;
  navigationButtons?: ButtonVisibility;
  paneButtons?: ButtonVisibility;
  marginTopPercent?: number;
  marginBottomPercent?: number;
  marginRightBars?: number;
};

export type TradingDisplaySettings = {
  showBuySellButtons?: boolean;
  showOrders?: boolean;
  showPositions?: boolean;
  showExecutions?: boolean;
  showPnL?: boolean;
};

export type EventOverlaySettings = {
  showEarnings?: boolean;
  showDividend?: boolean;
  showSplit?: boolean;
  showFiling?: boolean;
  showMacro?: boolean;
  showNews?: boolean;
  showOptionsExpiration?: boolean;
};

/** Grouped persisted shape. */
export type GroupedChartSettings = {
  symbol?: SymbolStyleSettings;
  statusLine?: StatusLineSettings;
  scales?: ScaleSettings;
  canvas?: CanvasSettings;
  trading?: TradingDisplaySettings;
  events?: EventOverlaySettings;
};

/** Legacy flat keys still accepted on load and in partial patches. */
export type LegacyFlatChartSettings = {
  showSymbolTitle?: boolean;
  showOHLC?: boolean;
  showVolume?: boolean;
  showPriceScale?: boolean;
  showTimeScale?: boolean;
  showGrid?: boolean;
  showCrosshair?: boolean;
  priceScaleType?: PriceScaleType;
  crosshairMode?: CrosshairMode;
  timeZone?: ChartTimeZone;
  noOverlappingPriceLabels?: boolean;
  showPricePlusButton?: boolean;
  showCountdownToBarClose?: boolean;
  symbolPriceLabelMode?: SymbolPriceLabelMode;
  indicatorPriceLabelMode?: IndicatorPriceLabelMode;
  drawingPriceLabels?: DrawingPriceLabelMode;
  priceScalePlacement?: PriceScalePlacement;
  invertPriceScale?: boolean;
  scalePriceChartOnly?: boolean;
  highLowLabelMode?: MarketLabelMode;
  bidAskLabelMode?: MarketLabelMode;
  prePostMarketLabelMode?: MarketLabelMode;
};

export type ChartSettings = GroupedChartSettings & LegacyFlatChartSettings;

export type RequiredSymbolStyleSettings = Required<SymbolStyleSettings>;
export type RequiredStatusLineSettings = Required<StatusLineSettings>;
export type RequiredScaleSettings = Required<ScaleSettings>;
export type RequiredCanvasSettings = Required<CanvasSettings>;
export type RequiredTradingDisplaySettings = Required<TradingDisplaySettings>;
export type RequiredEventOverlaySettings = Required<EventOverlaySettings>;

export type RequiredChartSettings = {
  symbol: RequiredSymbolStyleSettings;
  statusLine: RequiredStatusLineSettings;
  scales: RequiredScaleSettings;
  canvas: RequiredCanvasSettings;
  trading: RequiredTradingDisplaySettings;
  events: RequiredEventOverlaySettings;
};

const DEFAULT_SYMBOL: RequiredSymbolStyleSettings = {
  bodyUpColor: null,
  bodyDownColor: null,
  borderUpColor: null,
  borderDownColor: null,
  wickUpColor: null,
  wickDownColor: null,
  showBody: true,
  showBorders: false,
  showWicks: true,
  colorBarsByPreviousClose: false,
  precision: 'default',
  timeZone: DEFAULT_CHART_TIMEZONE,
  sessionMode: 'regular',
};

const DEFAULT_STATUS_LINE: RequiredStatusLineSettings = {
  showLogo: true,
  showTitle: true,
  titleMode: 'name',
  showMarketStatus: true,
  showChartValues: true,
  showBarChangeValues: true,
  showVolume: true,
  showLastDayChange: false,
  indicatorShowTitles: true,
  indicatorShowInputs: true,
  indicatorShowValues: true,
  indicatorBackgroundOpacity: 80,
};

const DEFAULT_SCALES: RequiredScaleSettings = {
  showPriceScale: true,
  showTimeScale: true,
  priceScaleType: 'linear',
  priceScalePlacement: 'right',
  invertPriceScale: false,
  scalePriceChartOnly: false,
  noOverlappingPriceLabels: true,
  showPricePlusButton: true,
  showCountdownToBarClose: true,
  symbolPriceLabelMode: 'valueLine',
  indicatorPriceLabelMode: 'nameValue',
  drawingPriceLabels: 'visible',
  highLowLabelMode: 'hidden',
  bidAskLabelMode: 'hidden',
  prePostMarketLabelMode: 'hidden',
  axisTextColor: null,
  axisTextSize: 11,
  axisLineColor: null,
};

const DEFAULT_CANVAS: RequiredCanvasSettings = {
  backgroundColor: null,
  showGrid: true,
  gridMode: 'both',
  gridColor: null,
  gridLineStyle: 'solid',
  gridOpacity: 18,
  showCrosshair: true,
  crosshairMode: 'cross',
  lockCrosshairToTime: false,
  lockedCrosshairPlotX: null,
  crosshairColor: null,
  crosshairLineStyle: 'dashed',
  watermarkVisible: false,
  watermarkMode: 'symbol',
  navigationButtons: 'hover',
  paneButtons: 'hover',
  marginTopPercent: 3,
  marginBottomPercent: 3,
  marginRightBars: 5,
};

const DEFAULT_TRADING: RequiredTradingDisplaySettings = {
  showBuySellButtons: false,
  showOrders: false,
  showPositions: false,
  showExecutions: false,
  showPnL: false,
};

const DEFAULT_EVENTS: RequiredEventOverlaySettings = {
  showEarnings: true,
  showDividend: true,
  showSplit: true,
  showFiling: true,
  showMacro: true,
  showNews: false,
  showOptionsExpiration: false,
};

export const DEFAULT_CHART_SETTINGS: RequiredChartSettings = {
  symbol: DEFAULT_SYMBOL,
  statusLine: DEFAULT_STATUS_LINE,
  scales: DEFAULT_SCALES,
  canvas: DEFAULT_CANVAS,
  trading: DEFAULT_TRADING,
  events: DEFAULT_EVENTS,
};

const LEGACY_FLAT_KEYS = new Set<string>([
  'showSymbolTitle',
  'showOHLC',
  'showVolume',
  'showPriceScale',
  'showTimeScale',
  'showGrid',
  'showCrosshair',
  'priceScaleType',
  'crosshairMode',
  'timeZone',
  'noOverlappingPriceLabels',
  'showPricePlusButton',
  'showCountdownToBarClose',
  'symbolPriceLabelMode',
  'indicatorPriceLabelMode',
  'drawingPriceLabels',
  'priceScalePlacement',
  'invertPriceScale',
  'scalePriceChartOnly',
  'highLowLabelMode',
  'bidAskLabelMode',
  'prePostMarketLabelMode',
]);

function isLegacyFlatInput(partial: ChartSettings): boolean {
  return Object.keys(partial).some((key) => LEGACY_FLAT_KEYS.has(key));
}

function migrateLegacyFlat(partial: LegacyFlatChartSettings): GroupedChartSettings {
  const grouped: GroupedChartSettings = {};
  const symbol: SymbolStyleSettings = {};
  const statusLine: StatusLineSettings = {};
  const scales: ScaleSettings = {};
  const canvas: CanvasSettings = {};

  if (partial.showSymbolTitle != null) {
    statusLine.showTitle = partial.showSymbolTitle;
    statusLine.showLogo = partial.showSymbolTitle;
  }
  if (partial.showOHLC != null) statusLine.showChartValues = partial.showOHLC;
  if (partial.showVolume != null) statusLine.showVolume = partial.showVolume;
  if (partial.showPriceScale != null) scales.showPriceScale = partial.showPriceScale;
  if (partial.showTimeScale != null) scales.showTimeScale = partial.showTimeScale;
  if (partial.showGrid != null) canvas.showGrid = partial.showGrid;
  if (partial.showCrosshair != null) canvas.showCrosshair = partial.showCrosshair;
  if (partial.priceScaleType != null) scales.priceScaleType = partial.priceScaleType;
  if (partial.crosshairMode != null) canvas.crosshairMode = partial.crosshairMode;
  if (partial.timeZone != null) symbol.timeZone = partial.timeZone;
  if (partial.noOverlappingPriceLabels != null) {
    scales.noOverlappingPriceLabels = partial.noOverlappingPriceLabels;
  }
  if (partial.showPricePlusButton != null) {
    scales.showPricePlusButton = partial.showPricePlusButton;
  }
  if (partial.showCountdownToBarClose != null) {
    scales.showCountdownToBarClose = partial.showCountdownToBarClose;
  }
  if (partial.symbolPriceLabelMode != null) {
    scales.symbolPriceLabelMode = partial.symbolPriceLabelMode;
  }
  if (partial.indicatorPriceLabelMode != null) {
    scales.indicatorPriceLabelMode = partial.indicatorPriceLabelMode;
  }
  if (partial.drawingPriceLabels != null) {
    scales.drawingPriceLabels = partial.drawingPriceLabels;
  }
  if (partial.priceScalePlacement != null) {
    scales.priceScalePlacement = partial.priceScalePlacement;
  }
  if (partial.invertPriceScale != null) scales.invertPriceScale = partial.invertPriceScale;
  if (partial.scalePriceChartOnly != null) {
    scales.scalePriceChartOnly = partial.scalePriceChartOnly;
  }
  if (partial.highLowLabelMode != null) scales.highLowLabelMode = partial.highLowLabelMode;
  if (partial.bidAskLabelMode != null) scales.bidAskLabelMode = partial.bidAskLabelMode;
  if (partial.prePostMarketLabelMode != null) {
    scales.prePostMarketLabelMode = partial.prePostMarketLabelMode;
  }

  if (Object.keys(symbol).length > 0) grouped.symbol = symbol;
  if (Object.keys(statusLine).length > 0) grouped.statusLine = statusLine;
  if (Object.keys(scales).length > 0) grouped.scales = scales;
  if (Object.keys(canvas).length > 0) grouped.canvas = canvas;

  return grouped;
}

function deepMergeSection<T extends Record<string, unknown>>(
  defaults: T,
  partial?: Partial<T> | null,
): T {
  if (!partial) return { ...defaults };
  return { ...defaults, ...partial } as T;
}

export function migrateChartSettings(partial?: ChartSettings | null): GroupedChartSettings {
  if (!partial) return {};

  const { symbol, statusLine, scales, canvas, trading, events, ...rest } = partial;
  const grouped: GroupedChartSettings = {
    symbol,
    statusLine,
    scales,
    canvas,
    trading,
    events,
  };

  if (isLegacyFlatInput(rest as ChartSettings)) {
    const legacy = migrateLegacyFlat(rest as LegacyFlatChartSettings);
    return {
      symbol: { ...legacy.symbol, ...grouped.symbol },
      statusLine: { ...legacy.statusLine, ...grouped.statusLine },
      scales: { ...legacy.scales, ...grouped.scales },
      canvas: { ...legacy.canvas, ...grouped.canvas },
      trading: grouped.trading,
      events: grouped.events,
    };
  }

  return grouped;
}

export function mergeChartSettings(
  partial?: ChartSettings | null,
): RequiredChartSettings {
  const migrated = migrateChartSettings(partial);
  const symbol = deepMergeSection(DEFAULT_SYMBOL, migrated.symbol);
  const statusLine = deepMergeSection(DEFAULT_STATUS_LINE, migrated.statusLine);
  const scales = deepMergeSection(DEFAULT_SCALES, migrated.scales);
  const canvas = deepMergeSection(DEFAULT_CANVAS, migrated.canvas);
  const trading = deepMergeSection(DEFAULT_TRADING, migrated.trading);
  const events = deepMergeSection(DEFAULT_EVENTS, migrated.events);

  return {
    symbol: {
      ...symbol,
      timeZone: normalizeChartTimeZone(symbol.timeZone),
    },
    statusLine: {
      ...statusLine,
      indicatorBackgroundOpacity: clamp(
        statusLine.indicatorBackgroundOpacity,
        0,
        100,
      ),
    },
    scales: {
      ...scales,
      axisTextSize: clamp(scales.axisTextSize, 8, 16),
    },
    canvas: {
      ...canvas,
      gridOpacity: clamp(canvas.gridOpacity, 0, 100),
      marginTopPercent: clamp(canvas.marginTopPercent, 0, 50),
      marginBottomPercent: clamp(canvas.marginBottomPercent, 0, 50),
      marginRightBars: clamp(canvas.marginRightBars, 0, 100),
    },
    trading,
    events,
  };
}

/** Merge a partial patch (grouped or legacy flat) onto existing settings. */
export function patchChartSettings(
  base: ChartSettings | undefined,
  patch: ChartSettings,
): GroupedChartSettings {
  const current = migrateChartSettings(base);
  const patchGrouped = migrateChartSettings(patch);
  return {
    symbol: { ...current.symbol, ...patchGrouped.symbol },
    statusLine: { ...current.statusLine, ...patchGrouped.statusLine },
    scales: { ...current.scales, ...patchGrouped.scales },
    canvas: { ...current.canvas, ...patchGrouped.canvas },
    trading: { ...current.trading, ...patchGrouped.trading },
    events: { ...current.events, ...patchGrouped.events },
  };
}

/** Strip grouped settings to persisted shape (no legacy flat keys). */
export function serializeChartSettings(
  settings: RequiredChartSettings,
): GroupedChartSettings {
  return {
    symbol: { ...settings.symbol },
    statusLine: { ...settings.statusLine },
    scales: { ...settings.scales },
    canvas: { ...settings.canvas },
    trading: { ...settings.trading },
    events: { ...settings.events },
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Resolved axis side for layout/rendering (`auto` maps to right today). */
export function resolvePriceScaleSide(
  placement: PriceScalePlacement,
): 'left' | 'right' {
  if (placement === 'left') return 'left';
  return 'right';
}

/** Resolve color override or fall back to theme token. */
export function resolveColorOverride(
  override: string | null | undefined,
  fallback: string,
): string {
  if (override && override.trim()) return override;
  return fallback;
}

/** Resolve price decimals from symbol precision setting. */
export function resolvePriceDecimals(precision: PricePrecision): number | undefined {
  if (precision === 'default') return undefined;
  return precision;
}

export type ResolvedSymbolColors = {
  up: string;
  down: string;
  wickUp: string;
  wickDown: string;
  borderUp: string;
  borderDown: string;
};

export function resolveSymbolColors(
  settings: RequiredSymbolStyleSettings,
  theme: Theme,
): ResolvedSymbolColors {
  const c = getChartColors(theme);
  const up = resolveColorOverride(settings.bodyUpColor, c.up);
  const down = resolveColorOverride(settings.bodyDownColor, c.down);
  return {
    up,
    down,
    wickUp: resolveColorOverride(settings.wickUpColor ?? settings.bodyUpColor, c.wick),
    wickDown: resolveColorOverride(settings.wickDownColor ?? settings.bodyDownColor, c.wick),
    borderUp: resolveColorOverride(settings.borderUpColor ?? settings.bodyUpColor, up),
    borderDown: resolveColorOverride(settings.borderDownColor ?? settings.bodyDownColor, down),
  };
}

export function applyLineDash(ctx: CanvasRenderingContext2D, style: ChartLineStyle): void {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([4, 2]);
      break;
    case 'dotted':
      ctx.setLineDash([2, 2]);
      break;
    default:
      ctx.setLineDash([]);
  }
}

export function shouldShowGridLines(
  canvas: RequiredCanvasSettings,
  orientation: 'horizontal' | 'vertical',
): boolean {
  if (!canvas.showGrid) return false;
  if (canvas.gridMode === 'none') return false;
  if (canvas.gridMode === 'both') return true;
  return canvas.gridMode === orientation;
}
