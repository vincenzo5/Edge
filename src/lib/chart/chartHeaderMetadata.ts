import type { ChartType, Interval } from '@/lib/chartConfig';

export type HeaderMenuCategory =
  | 'ticks'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'ranges';

export type IntervalMenuItem = {
  id: string;
  label: string;
  category: HeaderMenuCategory;
  interval?: Interval;
  implemented: boolean;
  disabledReason?: string;
};

export type ChartTypeMenuItem = {
  id: string;
  label: string;
  chartType?: ChartType;
  section: 'candle' | 'line' | 'area' | 'column' | 'advanced' | 'alternative';
  implemented: boolean;
  disabledReason?: string;
};

export type HeaderActionId =
  | 'indicators'
  | 'indicatorFavorites'
  | 'templates'
  | 'alert'
  | 'replay'
  | 'undo'
  | 'redo'
  | 'settings'
  | 'layout'
  | 'search'
  | 'fullscreen'
  | 'snapshot'
  | 'trade'
  | 'publish';

export type HeaderActionDescriptor = {
  id: HeaderActionId;
  label: string;
  implemented: boolean;
  disabledReason?: string;
  shortcut?: string;
};

const INTERVAL_LABELS: Record<Interval, string> = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
  '1d': '1 day',
  '1wk': '1 week',
  '1mo': '1 month',
};

/** TradingView-style interval menu with supported + placeholder entries. */
export const INTERVAL_MENU: IntervalMenuItem[] = [
  { id: 'tick-1', label: '1 tick', category: 'ticks', implemented: false, disabledReason: 'Tick data not supported' },
  { id: 'sec-1', label: '1 second', category: 'seconds', implemented: false, disabledReason: 'Second intervals not supported' },
  { id: 'sec-5', label: '5 seconds', category: 'seconds', implemented: false, disabledReason: 'Second intervals not supported' },
  { id: 'sec-15', label: '15 seconds', category: 'seconds', implemented: false, disabledReason: 'Second intervals not supported' },
  { id: 'sec-30', label: '30 seconds', category: 'seconds', implemented: false, disabledReason: 'Second intervals not supported' },
  { id: '1m', label: '1 minute', category: 'minutes', interval: '1m', implemented: true },
  { id: '2m', label: '2 minutes', category: 'minutes', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '3m', label: '3 minutes', category: 'minutes', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '5m', label: '5 minutes', category: 'minutes', interval: '5m', implemented: true },
  { id: '10m', label: '10 minutes', category: 'minutes', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '15m', label: '15 minutes', category: 'minutes', interval: '15m', implemented: true },
  { id: '30m', label: '30 minutes', category: 'minutes', interval: '30m', implemented: true },
  { id: '45m', label: '45 minutes', category: 'minutes', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '1h', label: '1 hour', category: 'hours', interval: '1h', implemented: true },
  { id: '2h', label: '2 hours', category: 'hours', interval: '2h', implemented: true },
  { id: '3h', label: '3 hours', category: 'hours', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '4h', label: '4 hours', category: 'hours', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '8h', label: '8 hours', category: 'hours', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '12h', label: '12 hours', category: 'hours', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '1d', label: '1 day', category: 'days', interval: '1d', implemented: true },
  { id: '3d', label: '3 days', category: 'days', implemented: false, disabledReason: 'Not available from data provider' },
  { id: '1wk', label: '1 week', category: 'days', interval: '1wk', implemented: true },
  { id: '1mo', label: '1 month', category: 'days', interval: '1mo', implemented: true },
  { id: '3mo', label: '3 months', category: 'days', implemented: false, disabledReason: 'Use range presets instead' },
  { id: '6mo', label: '6 months', category: 'days', implemented: false, disabledReason: 'Use range presets instead' },
  { id: '12mo', label: '12 months', category: 'days', implemented: false, disabledReason: 'Use range presets instead' },
];

export const INTERVAL_CATEGORY_LABELS: Record<HeaderMenuCategory, string> = {
  ticks: 'TICKS',
  seconds: 'SECONDS',
  minutes: 'MINUTES',
  hours: 'HOURS',
  days: 'DAYS',
  ranges: 'RANGES',
};

export const INTERVAL_MENU_CATEGORIES: HeaderMenuCategory[] = [
  'ticks',
  'seconds',
  'minutes',
  'hours',
  'days',
];

/** TradingView-style chart type menu. */
export const CHART_TYPE_MENU: ChartTypeMenuItem[] = [
  { id: 'ohlc', label: 'Bars', chartType: 'ohlc', section: 'candle', implemented: true },
  { id: 'candle_solid', label: 'Candles', chartType: 'candle_solid', section: 'candle', implemented: true },
  { id: 'candle_stroke', label: 'Hollow candles', chartType: 'candle_stroke', section: 'candle', implemented: true },
  { id: 'volume_candles', label: 'Volume candles', section: 'candle', implemented: false, disabledReason: 'Coming soon' },
  { id: 'line', label: 'Line', section: 'line', implemented: false, disabledReason: 'Coming soon' },
  { id: 'line_markers', label: 'Line with markers', section: 'line', implemented: false, disabledReason: 'Coming soon' },
  { id: 'step_line', label: 'Step line', section: 'line', implemented: false, disabledReason: 'Coming soon' },
  { id: 'area', label: 'Area', chartType: 'area', section: 'area', implemented: true },
  { id: 'hlc_area', label: 'HLC area', section: 'area', implemented: false, disabledReason: 'Coming soon' },
  { id: 'baseline', label: 'Baseline', section: 'area', implemented: false, disabledReason: 'Coming soon' },
  { id: 'columns', label: 'Columns', section: 'column', implemented: false, disabledReason: 'Coming soon' },
  { id: 'high_low', label: 'High-low', section: 'column', implemented: false, disabledReason: 'Coming soon' },
  { id: 'volume_footprint', label: 'Volume footprint', section: 'advanced', implemented: false, disabledReason: 'Coming soon' },
  { id: 'tpo', label: 'Time price opportunity', section: 'advanced', implemented: false, disabledReason: 'Coming soon' },
  { id: 'session_volume', label: 'Session volume profile', section: 'advanced', implemented: false, disabledReason: 'Coming soon' },
  { id: 'heikin_ashi', label: 'Heikin Ashi', chartType: 'heikin_ashi', section: 'alternative', implemented: true },
  { id: 'renko', label: 'Renko', section: 'alternative', implemented: false, disabledReason: 'Coming soon' },
  { id: 'line_break', label: 'Line break', section: 'alternative', implemented: false, disabledReason: 'Coming soon' },
  { id: 'kagi', label: 'Kagi', section: 'alternative', implemented: false, disabledReason: 'Coming soon' },
  { id: 'point_figure', label: 'Point & figure', section: 'alternative', implemented: false, disabledReason: 'Coming soon' },
  { id: 'range_bars', label: 'Range', section: 'alternative', implemented: false, disabledReason: 'Coming soon' },
];

export const CHART_TYPE_SECTION_ORDER: ChartTypeMenuItem['section'][] = [
  'candle',
  'line',
  'area',
  'column',
  'advanced',
  'alternative',
];

export function intervalShortLabel(interval: Interval): string {
  switch (interval) {
    case '1m':
      return '1m';
    case '5m':
      return '5m';
    case '15m':
      return '15m';
    case '30m':
      return '30m';
    case '1h':
      return '1h';
    case '2h':
      return '2h';
    case '1d':
      return 'D';
    case '1wk':
      return 'W';
    case '1mo':
      return 'M';
    default:
      return INTERVAL_LABELS[interval] ?? interval;
  }
}

export function groupIntervalMenu(): Record<HeaderMenuCategory, IntervalMenuItem[]> {
  const out = Object.fromEntries(
    INTERVAL_MENU_CATEGORIES.map((c) => [c, [] as IntervalMenuItem[]]),
  ) as Record<HeaderMenuCategory, IntervalMenuItem[]>;
  for (const item of INTERVAL_MENU) {
    out[item.category].push(item);
  }
  return out;
}

export function groupChartTypeMenu(): Record<ChartTypeMenuItem['section'], ChartTypeMenuItem[]> {
  const out = Object.fromEntries(
    CHART_TYPE_SECTION_ORDER.map((s) => [s, [] as ChartTypeMenuItem[]]),
  ) as Record<ChartTypeMenuItem['section'], ChartTypeMenuItem[]>;
  for (const item of CHART_TYPE_MENU) {
    out[item.section].push(item);
  }
  return out;
}

export const HEADER_ACTIONS: HeaderActionDescriptor[] = [
  { id: 'indicators', label: 'Indicators', implemented: true },
  { id: 'indicatorFavorites', label: 'Favorite indicators', implemented: true },
  { id: 'templates', label: 'Templates', implemented: true },
  { id: 'alert', label: 'Alert', implemented: false, disabledReason: 'Alerts coming soon' },
  { id: 'replay', label: 'Replay', implemented: true },
  { id: 'undo', label: 'Undo', implemented: true, shortcut: '⌘ Z' },
  { id: 'redo', label: 'Redo', implemented: true, shortcut: '⌘ ⇧ Z' },
  { id: 'settings', label: 'Settings', implemented: true },
  { id: 'trade', label: 'Trade', implemented: false, disabledReason: 'Trading not available' },
  { id: 'publish', label: 'Publish', implemented: false, disabledReason: 'Publishing not available' },
];
