import type { Candle, Interval, Range, VisibleRange } from '@edge/chart-core';
import {
  attachViewportHelpers,
  createViewport,
  DEFAULT_VISIBLE_BARS,
  getLiveEdgeViewport,
  liveEdgeEndIndex,
} from './viewport';

const MS_DAY = 86_400_000;

/** Default visible calendar span for daily bars when no bottom-bar preset is active. */
export const DAILY_DEFAULT_VISIBLE_DAYS = 270;

const RANGE_DAYS: Partial<Record<Range, number>> = {
  '1d': 1,
  '5d': 5,
  '1mo': 30,
  '3mo': 90,
  '6mo': 180,
  '1y': 365,
  '2y': 730,
  '5y': 1825,
};

/** Bottom-bar presets (TradingView set). */
export const BOTTOM_RANGE_PRESETS: Range[] = [
  '1d',
  '5d',
  '1mo',
  '3mo',
  '6mo',
  'ytd',
  '1y',
  '5y',
  'max',
];

/** Cutoff timestamp for a range preset (bars at or after this time are shown). */
export function rangeCutoffMs(range: Range, ref = new Date()): number {
  if (range === 'ytd') {
    return new Date(ref.getFullYear(), 0, 1).getTime();
  }
  if (range === 'max') {
    return 0;
  }
  const days = RANGE_DAYS[range] ?? 365;
  return ref.getTime() - days * 86_400_000;
}

export function findStartIndexForCutoff(candles: Candle[], cutoffMs: number): number {
  if (candles.length === 0) return 0;
  if (cutoffMs <= 0) return 0;

  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid]!.t < cutoffMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Viewport that shows the selected range anchored to the latest bar. */
export function getRangeViewport(
  candles: Candle[],
  range: Range,
  width: number,
  height: number,
  ref = new Date(),
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    return createViewport(candles, width, height, 0, 0);
  }

  const cutoff = rangeCutoffMs(range, ref);
  let startIndex = findStartIndexForCutoff(candles, cutoff);
  // If every bar is older than the cutoff, show all loaded history instead of an empty window.
  if (startIndex >= n) startIndex = 0;
  const visibleCount = Math.max(1, n - startIndex);
  const endIndex = liveEdgeEndIndex(startIndex, n, width);
  const margin = endIndex - n;

  const base = createViewport(candles, width, height, visibleCount, margin);
  return attachViewportHelpers({ ...base, startIndex, endIndex }, n);
}

/** Viewport anchored to the latest bar for a calendar-day lookback. */
export function getCalendarWindowViewport(
  candles: Candle[],
  width: number,
  height: number,
  calendarDays: number,
  ref = new Date(),
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    return createViewport(candles, width, height, 0, 0);
  }

  const cutoff = ref.getTime() - calendarDays * MS_DAY;
  let startIndex = findStartIndexForCutoff(candles, cutoff);
  if (startIndex >= n) startIndex = 0;
  const visibleCount = Math.max(1, n - startIndex);
  const endIndex = liveEdgeEndIndex(startIndex, n, width);
  const margin = endIndex - n;

  const base = createViewport(candles, width, height, visibleCount, margin);
  return attachViewportHelpers({ ...base, startIndex, endIndex }, n);
}

/** Viewport that shows every candle in the fetched dataset (fetch is already scoped to range). */
export function getFetchedWindowViewport(
  candles: Candle[],
  width: number,
  height: number,
): VisibleRange {
  const n = candles.length;
  if (n === 0) return createViewport(candles, width, height, 0, 0);
  return getLiveEdgeViewport(candles, width, height, n);
}

/** Viewport after symbol/range/interval/preset change — not used for history prepend. */
export function getSessionViewport(
  candles: Candle[],
  width: number,
  height: number,
  rangePreset: Range | null,
  interval?: Interval | null,
): VisibleRange {
  if (rangePreset != null) {
    if (rangePreset === 'max') {
      return getFetchedWindowViewport(candles, width, height);
    }
    return getRangeViewport(candles, rangePreset, width, height);
  }
  switch (interval) {
    case '1d':
      return getCalendarWindowViewport(
        candles,
        width,
        height,
        DAILY_DEFAULT_VISIBLE_DAYS,
      );
    case '1wk':
    case '1mo':
      return getFetchedWindowViewport(candles, width, height);
    default:
      return getLiveEdgeViewport(candles, width, height, DEFAULT_VISIBLE_BARS);
  }
}

export function rangePresetLabel(range: Range): string {
  switch (range) {
    case '1mo':
      return '1M';
    case '3mo':
      return '3M';
    case '6mo':
      return '6M';
    case 'max':
      return 'All';
    default:
      return range.toUpperCase();
  }
}
