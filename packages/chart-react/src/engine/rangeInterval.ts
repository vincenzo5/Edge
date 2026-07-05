import type { Interval, Range } from '@edge/chart-core';

/** Default bar size for each bottom-bar range preset (TradingView parity). */
export function intervalForRange(range: Range): Interval {
  switch (range) {
    case '1d':
      return '1m';
    case '5d':
      return '5m';
    case '1mo':
      return '30m';
    case '3mo':
      return '1h';
    case '6mo':
      return '2h';
    case 'ytd':
    case '1y':
    case '2y':
      return '1d';
    case '5y':
      return '1wk';
    case 'max':
      return '1mo';
    default:
      return '1d';
  }
}

/** Fetch range paired with a manually selected interval (header dropdown). */
export function rangeForManualInterval(interval: Interval): Range {
  switch (interval) {
    case '1wk':
      return '5y';
    case '1mo':
      return 'max';
    default:
      return '1y';
  }
}

/** Effective candle fetch range for a cell (widens stale 1y+monthly/weekly combos). */
export function resolveCellFetchRange(config: {
  range: Range;
  interval: Interval;
  rangePreset?: Range | null;
}): Range {
  if (config.rangePreset != null) return config.range;
  if (config.interval === '1mo') return 'max';
  if (config.interval === '1wk') {
    return config.range === '5y' || config.range === 'max' ? config.range : '5y';
  }
  return config.range;
}
