import type { Candle, VisibleRange } from './contracts';
import {
  attachViewportHelpers,
  clampTimeWindow,
  MIN_CANDLES,
  type ViewportState,
} from './viewport';

export type GoToRequest =
  | { mode: 'date'; at: number }
  | { mode: 'range'; from: number; to: number };

export type GoToResult =
  | { ok: true }
  | { ok: false; reason: 'out_of_range' | 'no_data' | 'replay_active' | 'invalid_range' | 'invalid_date' };

/** First bar with timestamp >= ms (or candles.length if all bars are older). */
export function findIndexAtOrAfter(candles: Candle[], ms: number): number {
  if (candles.length === 0) return 0;
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid]!.t < ms) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Last bar with timestamp <= ms (or -1 if all bars are newer). */
export function findIndexAtOrBefore(candles: Candle[], ms: number): number {
  if (candles.length === 0) return -1;
  let lo = 0;
  let hi = candles.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid]!.t <= ms) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export function isTimestampInLoadedRange(candles: Candle[], ms: number): boolean {
  if (candles.length === 0) return false;
  return ms >= candles[0]!.t && ms <= candles[candles.length - 1]!.t;
}

export function isRangeInLoadedData(candles: Candle[], fromMs: number, toMs: number): boolean {
  if (candles.length === 0) return false;
  return fromMs >= candles[0]!.t && toMs <= candles[candles.length - 1]!.t;
}

/** Center target bar in viewport, preserving visible span (zoom level). */
export function goToDate(
  vp: ViewportState,
  candles: Candle[],
  targetMs: number,
  anchorRatio = 0.5,
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    return attachViewportHelpers({ ...vp, startIndex: 0, endIndex: 0 }, 0);
  }

  let targetIndex = findIndexAtOrAfter(candles, targetMs);
  if (targetIndex >= n) targetIndex = n - 1;

  const visible = Math.max(MIN_CANDLES, vp.endIndex - vp.startIndex);
  let start = targetIndex - anchorRatio * visible;
  let end = start + visible;
  const clamped = clampTimeWindow(start, end, n, true);
  return attachViewportHelpers({ ...vp, startIndex: clamped.start, endIndex: clamped.end }, n);
}

/** Fit viewport to show the inclusive date range [startMs, endMs]. */
export function goToRange(
  vp: ViewportState,
  candles: Candle[],
  startMs: number,
  endMs: number,
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    return attachViewportHelpers({ ...vp, startIndex: 0, endIndex: 0 }, 0);
  }

  let startIndex = findIndexAtOrAfter(candles, startMs);
  if (startIndex >= n) startIndex = n - 1;

  let endIndex = findIndexAtOrBefore(candles, endMs);
  if (endIndex < 0) endIndex = 0;
  endIndex += 1;

  if (endIndex <= startIndex) {
    endIndex = Math.min(n, startIndex + MIN_CANDLES);
  }

  const clamped = clampTimeWindow(startIndex, endIndex, n, false);
  return attachViewportHelpers({ ...vp, startIndex: clamped.start, endIndex: clamped.end }, n);
}
