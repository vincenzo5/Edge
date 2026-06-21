import type { Candle, VisibleRange } from './contracts';
import { plotWidth } from './layout';

export type ViewportState = {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  width: number;
  height: number;
};

const MIN_CANDLES = 10;
const MAX_CANDLES = 5000;
const PADDING = 0.05; // 5% price padding
const TIME_SCALE_SENSITIVITY = 0.5;
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
  initialCount = 100
): VisibleRange {
  const n = candles.length;
  if (n === 0) {
    const base = { startIndex: 0, endIndex: 0, priceMin: 0, priceMax: 1, width, height, scaleMode: 'auto' } as any;
    base.xForIndex = (i: number) => 0;
    base.yForPrice = (p: number) => 0;
    base.indexForX = (x: number) => 0;
    base.priceForY = (y: number) => 0;
    return base as VisibleRange;
  }
  const end = n;
  const start = Math.max(0, end - initialCount);
  const { priceMin, priceMax } = computePriceRange(candles, start, end);

  const base = { startIndex: start, endIndex: end, priceMin, priceMax, width, height, scaleMode: 'auto' } as any;

  base.xForIndex = (i: number) => xForIndex(i, base);
  base.yForPrice = (p: number) => yForPrice(p, base);
  base.indexForX = (x: number) => indexAtX(x, base, n);
  base.priceForY = (y: number) => priceAtY(y, base);

  return base as VisibleRange;
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
  const idx = vp.startIndex + Math.floor((x / vp.width) * visible);
  const minStart = scrollMinStart();
  const maxEnd = scrollMaxEnd(candleCount);
  return Math.max(minStart, Math.min(maxEnd - 1, idx));
}

export function priceAtY(y: number, vp: ViewportState): number {
  const range = vp.priceMax - vp.priceMin;
  return vp.priceMax - (y / vp.height) * range;
}

export function xForIndex(i: number, vp: ViewportState): number {
  const visible = vp.endIndex - vp.startIndex;
  if (visible <= 0) return 0;
  return ((i - vp.startIndex) / visible) * vp.width;
}

export function yForPrice(p: number, vp: ViewportState): number {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return 0;
  return ((vp.priceMax - p) / range) * vp.height;
}

// Core pan (deltaX in pixels, positive = pan right = show older candles)
export function pan(vp: ViewportState, deltaX: number, totalCandles: number): VisibleRange {
  const visible = vp.endIndex - vp.startIndex;
  const shift = Math.round((deltaX / vp.width) * visible);
  const { start, end } = clampTimeWindow(vp.startIndex - shift, vp.endIndex - shift, totalCandles);
  const next = { ...vp, startIndex: start, endIndex: end } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, totalCandles);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

// Zoom centered on anchorX (pixel)
export function zoom(vp: ViewportState, factor: number, anchorX: number, totalCandles: number): VisibleRange {
  const visible = vp.endIndex - vp.startIndex;
  const anchorRatio = anchorX / vp.width;
  const newVisible = Math.max(MIN_CANDLES, Math.min(MAX_CANDLES, Math.round(visible / factor)));
  const anchorIndex = vp.startIndex + Math.floor(anchorRatio * visible);
  let start = Math.round(anchorIndex - anchorRatio * newVisible);
  let end = start + newVisible;
  const clamped = clampTimeWindow(start, end, totalCandles, false);
  start = clamped.start;
  end = clamped.end;
  const next = { ...vp, startIndex: start, endIndex: end } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, totalCandles);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

// Translate price range (manual mode body drag); preserves range width
export function panPrice(vp: ViewportState, deltaY: number): VisibleRange {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return vp as VisibleRange;
  const shift = (deltaY / vp.height) * range;
  const priceMin = vp.priceMin + shift;
  const priceMax = vp.priceMax + shift;
  const next = { ...vp, priceMin, priceMax } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

export function scaleTime(vp: ViewportState, deltaX: number, totalCandles: number): VisibleRange {
  const factor = 1 + (deltaX / vp.width) * TIME_SCALE_SENSITIVITY;
  const anchorX = plotWidth(vp.width) / 2;
  const zoomed = zoom(vp, factor, anchorX, totalCandles);
  const next = { ...zoomed, scaleMode: 'manual' } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, totalCandles);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

/** Re-fit price bounds to visible candles when scale mode is auto. */
export function applyAutoPriceScale(vp: ViewportState, candles: Candle[]): VisibleRange {
  if ((vp as any).scaleMode === 'manual') return vp as VisibleRange;
  return updatePriceRange(vp, candles);
}

// Update price range after data or range change
export function updatePriceRange(vp: ViewportState, candles: Candle[]): VisibleRange {
  if ((vp as any).scaleMode === 'manual') return vp as VisibleRange;
  const { priceMin, priceMax } = computePriceRange(candles, vp.startIndex, vp.endIndex);
  const next = { ...vp, priceMin, priceMax } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

// Momentum loop helper (call inside rAF)
export function applyMomentum(vp: ViewportState, velocity: number, totalCandles: number): { vp: VisibleRange; velocity: number } {
  if (Math.abs(velocity) < 0.5) return { vp: vp as VisibleRange, velocity: 0 };
  const nextVp = pan(vp, velocity, totalCandles);
  return { vp: nextVp, velocity: velocity * 0.9 };
}

export function scalePrice(vp: any, deltaY: number): VisibleRange {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return vp as VisibleRange;
  const factor = 1 + (deltaY / vp.height) * 0.8;
  const newRange = Math.max(1e-8, range * factor);
  const mid = (vp.priceMin + vp.priceMax) / 2;
  const priceMin = mid - newRange / 2;
  const priceMax = mid + newRange / 2;
  const next = { ...vp, priceMin, priceMax, scaleMode: 'manual' } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

export function resetPriceScale(vp: any, candles: Candle[]): VisibleRange {
  const { priceMin, priceMax } = computePriceRange(candles, vp.startIndex, vp.endIndex);
  const next = { ...vp, priceMin, priceMax, scaleMode: 'auto' } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

export function setScaleMode(vp: any, mode: 'auto' | 'manual'): VisibleRange {
  const next = { ...vp, scaleMode: mode } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}

export function zoomPrice(vp: any, factor: number): VisibleRange {
  const range = vp.priceMax - vp.priceMin;
  if (range <= 0) return vp as VisibleRange;
  const newRange = Math.max(1e-8, range / factor);
  const mid = (vp.priceMin + vp.priceMax) / 2;
  const priceMin = mid - newRange / 2;
  const priceMax = mid + newRange / 2;
  const next = { ...vp, priceMin, priceMax, scaleMode: 'manual' } as any;
  next.xForIndex = (i: number) => xForIndex(i, next);
  next.yForPrice = (p: number) => yForPrice(p, next);
  next.indexForX = (x: number) => indexAtX(x, next, vp.endIndex);
  next.priceForY = (y: number) => priceAtY(y, next);
  return next as VisibleRange;
}
