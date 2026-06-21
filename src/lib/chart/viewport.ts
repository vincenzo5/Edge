import type { Candle, VisibleRange } from './contracts';
import { plotWidth, plotHeight, PRICE_AXIS_WIDTH } from './layout';

export type ViewportState = {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  width: number;
  height: number;
  priceScaleMode?: 'auto' | 'manual';
  /** When true, Y mapping excludes the bottom time-axis strip (default true). */
  reserveTimeAxis?: boolean;
};

function plotAreaHeight(vp: ViewportState): number {
  return plotHeight(vp.height, vp.reserveTimeAxis ?? true);
}

export const MIN_CANDLES = 10;
/** Default number of bars visible on initial load and after reset. */
export const DEFAULT_VISIBLE_BARS = 150;
/** Extra virtual bars after the last candle on default load / reset (breathing room before price axis). */
export const DEFAULT_RIGHT_MARGIN_BARS = 2;
const INDEX_EPS = 1e-6;
const PRICE_EPS = 1e-8;
const MAX_CANDLES = 5000;
const PADDING = 0.05; // 5% price padding
/** Horizontal time-axis drag: higher = zoom faster per pixel. */
export const TIME_SCALE_SENSITIVITY = 2.0;
/** Vertical price-axis drag: higher = scale faster per pixel. */
export const PRICE_SCALE_SENSITIVITY = 1.0;
/** Extra virtual candles allowed past first/last bar when panning horizontally. */
export const SCROLL_BUFFER_CANDLES = 100;

function scrollMinStart() {
  return -SCROLL_BUFFER_CANDLES;
}

function scrollMaxEnd(totalCandles: number) {
  return totalCandles + SCROLL_BUFFER_CANDLES;
}

function clampTimeWindow(
  start: number,
  end: number,
  totalCandles: number,
  preserveVisible = true
): { start: number; end: number } {
  const minStart = scrollMinStart();
  const maxEnd = scrollMaxEnd(totalCandles);
  if (preserveVisible) {
    const visible = end - start;
    if (start < minStart) {
      end -= start - minStart;
      start = minStart;
    }
    if (end > maxEnd) {
      start -= end - maxEnd;
      end = maxEnd;
    }
  }
  start = Math.max(minStart, start);
  end = Math.min(maxEnd, end);
  end = Math.max(end, Math.min(start + MIN_CANDLES, maxEnd));
  start = Math.min(start, maxEnd - MIN_CANDLES);
  start = Math.max(minStart, start);
  return { start, end };
}

function dataSliceStart(start: number, candleCount: number) {
  return Math.max(0, Math.min(candleCount, Math.floor(start)));
}

function dataSliceEnd(end: number, candleCount: number) {
  return Math.max(0, Math.min(candleCount, Math.ceil(end)));
}

export function createViewport(
  candles: Candle[],
  width: number,
  height: number,
  initialCount = 100,
  endMarginBars = 0
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    const base = { startIndex: 0, endIndex: 0, priceMin: 0, priceMax: 1, width, height, priceScaleMode: 'auto' } as any;
    base.xForIndex = (i: number) => 0;
    base.yForPrice = (p: number) => 0;
    base.indexForX = (x: number) => 0;
    base.priceForY = (y: number) => 0;
    return base as VisibleRange;
  }
  const end = n + endMarginBars;
  const start = Math.max(0, n - initialCount);
  const { priceMin, priceMax } = computePriceRange(candles, start, end);

  const base = { startIndex: start, endIndex: end, priceMin, priceMax, width, height, priceScaleMode: 'auto' } as any;

  return attachViewportHelpers(base, n);
}

/** Bind coordinate helpers; always pass real candle count (not endIndex). */
export function attachViewportHelpers(vp: ViewportState, candleCount: number): VisibleRange {
  const next = vp as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, candleCount);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

/** Clamp indices and re-fit price after candle count changes (same dims). */
export function refreshViewportForDataChange(
  vp: VisibleRange,
  candles: Candle[],
  width: number,
  height: number
): VisibleRange {
  const n = candles.length;
  let next = { ...vp } as any;
  next.endIndex = Math.min(next.endIndex, n + SCROLL_BUFFER_CANDLES);
  next.startIndex = Math.max(
    -SCROLL_BUFFER_CANDLES,
    Math.min(next.startIndex, next.endIndex - MIN_CANDLES)
  );
  next = applyAutoPriceScale(next, candles);
  next = updateViewportDimensions(next, width, height);
  return attachViewportHelpers(next, n);
}

export function updateViewportDimensions(vp: any, width: number, height: number) {
  vp.width = width;
  vp.height = height;
  return vp;
}

function computePriceRange(candles: Candle[], start: number, end: number) {
  if (candles.length === 0) {
    return { priceMin: 0, priceMax: 1 };
  }
  const ds = dataSliceStart(start, candles.length);
  const de = dataSliceEnd(end, candles.length);
  if (ds >= de) {
    // View is entirely in virtual margin — fit to nearest real bars
    if (end <= 0) {
      return computePriceRange(candles, 0, Math.min(candles.length, MIN_CANDLES));
    }
    if (start >= candles.length) {
      return computePriceRange(
        candles,
        Math.max(0, candles.length - MIN_CANDLES),
        candles.length
      );
    }
    return { priceMin: 0, priceMax: 1 };
  }
  let min = Infinity;
  let max = -Infinity;
  for (let i = ds; i < de; i++) {
    const c = candles[i];
    if (!c) continue;
    min = Math.min(min, c.l);
    max = Math.max(max, c.h);
  }
  if (min === Infinity || max === -Infinity || max <= min) {
    return { priceMin: 0, priceMax: 1 };
  }
  const pad = (max - min) * PADDING;
  return { priceMin: min - pad, priceMax: max + pad };
}

export function indexAtX(x: number, vp: ViewportState, candleCount: number): number {
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0) return 0;
  const pw = plotWidth(vp.width);
  const idx = vp.startIndex + Math.floor((x / pw) * visible);
  const minStart = scrollMinStart();
  const maxEnd = scrollMaxEnd(candleCount);
  return Math.max(minStart, Math.min(maxEnd - 1, idx));
}

export function priceAtY(y: number, vp: ViewportState): number {
  const ph = plotAreaHeight(vp);
  const range = vp.priceMax - vp.priceMin;
  if (ph <= 0 || range <= 0) return vp.priceMax;
  return vp.priceMax - (y / ph) * range;
}

export function xForIndex(i: number, vp: ViewportState): number {
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0) return 0;
  return ((i - vp.startIndex) / visible) * plotWidth(vp.width);
}

export function yForPrice(p: number, vp: ViewportState): number {
  const ph = plotAreaHeight(vp);
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0 || ph <= 0) return 0;
  return ((vp.priceMax - p) / range) * ph;
}

// Core pan (deltaX in pixels, positive = pan right = show older candles)
export function pan(vp: ViewportState, deltaX: number, totalCandles: number): VisibleRange {
  const visible = vp.endIndex - vp.startIndex;
  const pw = plotWidth(vp.width);
  const shift = Math.round((deltaX / pw) * visible);
  const { start, end } = clampTimeWindow(vp.startIndex - shift, vp.endIndex - shift, totalCandles);
  return attachViewportHelpers({ ...vp, startIndex: start, endIndex: end }, totalCandles);
}

// Zoom centered on anchorX (pixel); widthForRatio defaults to plot width (excludes price axis)
export function zoom(
  vp: ViewportState,
  factor: number,
  anchorX: number,
  totalCandles: number,
  widthForRatio = plotWidth(vp.width)
): VisibleRange {
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0 || factor <= 0) return attachViewportHelpers({ ...vp }, totalCandles);
  const anchorRatio = anchorX / widthForRatio;
  const newVisible = Math.max(MIN_CANDLES, Math.min(MAX_CANDLES, Math.round(visible / factor)));
  const anchorIndex = vp.startIndex + Math.floor(anchorRatio * visible);
  let start = Math.round(anchorIndex - anchorRatio * newVisible);
  let end = start + newVisible;
  const clamped = clampTimeWindow(start, end, totalCandles, false);
  start = clamped.start;
  end = clamped.end;
  return attachViewportHelpers({ ...vp, startIndex: start, endIndex: end }, totalCandles);
}

// Translate price range (manual mode body drag); preserves range width
export function panPrice(vp: ViewportState, deltaY: number, totalCandles: number): VisibleRange {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return vp as VisibleRange;
  const ph = plotAreaHeight(vp);
  if (ph <= 0) return vp as VisibleRange;
  const shift = (deltaY / ph) * range;
  const priceMin = vp.priceMin + shift;
  const priceMax = vp.priceMax + shift;
  return attachViewportHelpers({ ...vp, priceMin, priceMax }, totalCandles);
}

export function scaleTime(vp: ViewportState, deltaX: number, totalCandles: number): VisibleRange {
  return scaleTimeFromInitial(vp, deltaX, totalCandles);
}

/** Scale time axis from a fixed initial viewport using total horizontal drag (pixels). */
export function scaleTimeFromInitial(
  initial: ViewportState,
  totalDeltaX: number,
  totalCandles: number
): VisibleRange {
  const pw = plotWidth(initial.width);
  const factor = 1 + (totalDeltaX / pw) * TIME_SCALE_SENSITIVITY;
  const scaled = zoom(initial, factor, pw / 2, totalCandles, pw);
  return attachViewportHelpers({ ...scaled, priceScaleMode: 'manual' }, totalCandles);
}

/** Scale price axis from a fixed initial viewport using total vertical drag (pixels). */
export function scalePriceFromInitial(
  initial: ViewportState,
  totalDeltaY: number,
  totalCandles: number,
  reserveTimeAxis = true
): VisibleRange {
  const range = initial.priceMax - initial.priceMin;
  if (range <= 0) return attachViewportHelpers({ ...initial }, totalCandles);
  const ph = plotHeight(initial.height, reserveTimeAxis);
  const factor = 1 + (totalDeltaY / ph) * PRICE_SCALE_SENSITIVITY;
  const newRange = Math.max(1e-8, range * factor);
  const mid = (initial.priceMin + initial.priceMax) / 2;
  const priceMin = mid - newRange / 2;
  const priceMax = mid + newRange / 2;
  return attachViewportHelpers(
    { ...initial, priceMin, priceMax, priceScaleMode: 'manual' },
    totalCandles
  );
}

/** Re-fit price bounds to visible candles when price scale mode is auto. */
export function applyAutoPriceScale(vp: ViewportState, candles: Candle[]): VisibleRange {
  if ((vp as any).priceScaleMode === 'manual') return vp as VisibleRange;
  return updatePriceRange(vp, candles);
}

// Update price range after data or range change
export function updatePriceRange(vp: ViewportState, candles: Candle[]): VisibleRange {
  if ((vp as any).priceScaleMode === 'manual') return vp as VisibleRange;
  const { priceMin, priceMax } = computePriceRange(candles, vp.startIndex, vp.endIndex);
  return attachViewportHelpers({ ...vp, priceMin, priceMax }, candles.length);
}

// Momentum loop helper (call inside rAF)
export function applyMomentum(vp: ViewportState, velocity: number, totalCandles: number): { vp: VisibleRange; velocity: number } {
  if (Math.abs(velocity) < 0.5) return { vp: vp as VisibleRange, velocity: 0 };
  const nextVp = pan(vp, velocity, totalCandles);
  return { vp: nextVp, velocity: velocity * 0.9 };
}

export function scalePrice(
  vp: ViewportState,
  deltaY: number,
  totalCandles: number,
  reserveTimeAxis = true
): VisibleRange {
  return scalePriceFromInitial(vp, deltaY, totalCandles, reserveTimeAxis);
}

export function resetPriceScale(vp: any, candles: Candle[]): VisibleRange {
  const { priceMin, priceMax } = computePriceRange(candles, vp.startIndex, vp.endIndex);
  return attachViewportHelpers(
    { ...vp, priceMin, priceMax, priceScaleMode: 'auto' },
    candles.length
  );
}

export function setScaleMode(vp: any, mode: 'auto' | 'manual', totalCandles: number): VisibleRange {
  return attachViewportHelpers({ ...vp, priceScaleMode: mode }, totalCandles);
}

export function zoomPrice(vp: any, factor: number, totalCandles: number): VisibleRange {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return vp as VisibleRange;
  const newRange = Math.max(1e-8, range / factor);
  const mid = (vp.priceMin + vp.priceMax) / 2;
  const priceMin = mid - newRange / 2;
  const priceMax = mid + newRange / 2;
  return attachViewportHelpers({ ...vp, priceMin, priceMax, priceScaleMode: 'manual' }, totalCandles);
}

/** Virtual bars after the last candle so the latest bar clears the price-axis strip. */
export function defaultRightMarginBars(width: number, visibleCount: number): number {
  const pw = plotWidth(width);
  if (pw <= 0 || visibleCount <= 0) return DEFAULT_RIGHT_MARGIN_BARS;
  const axisBars = Math.ceil((PRICE_AXIS_WIDTH / pw) * visibleCount);
  return Math.max(DEFAULT_RIGHT_MARGIN_BARS, axisBars);
}

/** Fresh viewport matching initial chart load (last N bars, auto Y). */
export function getDefaultViewport(
  candles: Candle[],
  width: number,
  height: number
): VisibleRange {
  const initial = Math.min(DEFAULT_VISIBLE_BARS, candles.length);
  const margin = defaultRightMarginBars(width, initial);
  return createViewport(candles, width, height, initial, margin);
}

export function isTimeWindowModified(
  current: ViewportState,
  candles: Candle[],
  width: number,
  height: number
): boolean {
  if (candles.length === 0) return false;
  const def = getDefaultViewport(candles, width, height);
  return (
    Math.abs(current.startIndex - def.startIndex) > INDEX_EPS ||
    Math.abs(current.endIndex - def.endIndex) > INDEX_EPS
  );
}

export function isPriceRangeModified(
  current: Pick<ViewportState, 'priceMin' | 'priceMax' | 'priceScaleMode'>,
  expected: Pick<ViewportState, 'priceMin' | 'priceMax'>
): boolean {
  if (current.priceScaleMode === 'manual') return true;
  return (
    Math.abs(current.priceMin - expected.priceMin) > PRICE_EPS ||
    Math.abs(current.priceMax - expected.priceMax) > PRICE_EPS
  );
}

/**
 * True when the user has panned, zoomed, or scaled away from the default view.
 * Pass getAutoFit for sub-panes with indicator-specific Y ranges.
 */
export function isViewportModified(
  current: ViewportState,
  candles: Candle[],
  width: number,
  height: number,
  getAutoFit?: (vp: ViewportState) => Pick<ViewportState, 'priceMin' | 'priceMax'>
): boolean {
  if (candles.length === 0) return false;
  if (isTimeWindowModified(current, candles, width, height)) return true;
  if (current.priceScaleMode === 'manual') return true;
  const expected = getAutoFit
    ? getAutoFit(current)
    : computePriceRange(candles, current.startIndex, current.endIndex);
  return isPriceRangeModified(current, expected);
}
