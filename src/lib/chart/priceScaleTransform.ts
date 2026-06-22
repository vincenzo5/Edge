import type { Candle } from './contracts';
import { formatPrice } from './format';

export type PriceScaleType = 'linear' | 'log' | 'percent' | 'indexed';

export type PriceScaleContext = {
  type: PriceScaleType;
  /** Close of first visible data bar; used for percent/indexed. */
  anchorPrice: number;
};

const MIN_POSITIVE_PRICE = 1e-8;
const PADDING = 0.05;

export function linearScaleContext(): PriceScaleContext {
  return { type: 'linear', anchorPrice: 1 };
}

export function resolveAnchorPrice(candles: Candle[], startIndex: number): number {
  if (candles.length === 0) return 1;
  const ds = Math.max(0, Math.min(candles.length, Math.floor(startIndex)));
  const candle = candles[ds] ?? candles[candles.length - 1];
  const close = candle?.c;
  if (close != null && Number.isFinite(close) && close > 0) return close;
  return 1;
}

function safePositive(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return MIN_POSITIVE_PRICE;
  return price;
}

export function toScaleCoord(price: number, ctx: PriceScaleContext): number {
  if (!Number.isFinite(price)) return NaN;
  switch (ctx.type) {
    case 'linear':
      return price;
    case 'log':
      return Math.log(safePositive(price));
    case 'percent': {
      const anchor = safePositive(ctx.anchorPrice);
      return (price / anchor - 1) * 100;
    }
    case 'indexed': {
      const anchor = safePositive(ctx.anchorPrice);
      return (price / anchor) * 100;
    }
    default:
      return price;
  }
}

export function fromScaleCoord(coord: number, ctx: PriceScaleContext): number {
  if (!Number.isFinite(coord)) return NaN;
  switch (ctx.type) {
    case 'linear':
      return coord;
    case 'log':
      return Math.exp(coord);
    case 'percent': {
      const anchor = safePositive(ctx.anchorPrice);
      return anchor * (1 + coord / 100);
    }
    case 'indexed': {
      const anchor = safePositive(ctx.anchorPrice);
      return anchor * (coord / 100);
    }
    default:
      return coord;
  }
}

export function formatScaleLabel(coord: number, ctx: PriceScaleContext): string {
  if (!Number.isFinite(coord)) return '—';
  switch (ctx.type) {
    case 'linear':
      return formatPrice(coord, 2);
    case 'log':
      return formatPrice(fromScaleCoord(coord, ctx), 2);
    case 'percent': {
      const sign = coord >= 0 ? '+' : '';
      return `${sign}${formatPrice(coord, 2)}%`;
    }
    case 'indexed':
      return formatPrice(coord, 2);
    default:
      return formatPrice(coord, 2);
  }
}

function dataSliceStart(start: number, candleCount: number): number {
  return Math.max(0, Math.min(candleCount, Math.floor(start)));
}

function dataSliceEnd(end: number, candleCount: number): number {
  return Math.max(0, Math.min(candleCount, Math.ceil(end)));
}

export function computeScaleRange(
  candles: Candle[],
  start: number,
  end: number,
  ctx: PriceScaleContext,
): { min: number; max: number } {
  if (candles.length === 0) {
    return ctx.type === 'indexed' ? { min: 99, max: 101 } : { min: 0, max: 1 };
  }

  const ds = dataSliceStart(start, candles.length);
  const de = dataSliceEnd(end, candles.length);

  if (ds >= de) {
    if (end <= 0) {
      return computeScaleRange(candles, 0, Math.min(candles.length, 10), ctx);
    }
    if (start >= candles.length) {
      return computeScaleRange(
        candles,
        Math.max(0, candles.length - 10),
        candles.length,
        ctx,
      );
    }
    return ctx.type === 'indexed' ? { min: 99, max: 101 } : { min: 0, max: 1 };
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = ds; i < de; i++) {
    const c = candles[i];
    if (!c) continue;
    const lowCoord = toScaleCoord(c.l, ctx);
    const highCoord = toScaleCoord(c.h, ctx);
    if (Number.isFinite(lowCoord)) min = Math.min(min, lowCoord);
    if (Number.isFinite(highCoord)) max = Math.max(max, highCoord);
  }

  if (min === Infinity || max === -Infinity || max <= min) {
    return ctx.type === 'indexed' ? { min: 99, max: 101 } : { min: 0, max: 1 };
  }

  const pad = (max - min) * PADDING;
  return { min: min - pad, max: max + pad };
}

/** Build scale context from persisted type and visible window anchor. */
export function buildPriceScaleContext(
  type: PriceScaleType,
  candles: Candle[],
  startIndex: number,
): PriceScaleContext {
  if (type === 'linear') return linearScaleContext();
  return {
    type,
    anchorPrice: resolveAnchorPrice(candles, startIndex),
  };
}

/** Generate ~6 tick coordinates in scale space for axis labels. */
export function scaleAxisTicks(min: number, max: number, ctx: PriceScaleContext): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];

  if (ctx.type === 'log') {
    const logMin = min;
    const logMax = max;
    const ticks: number[] = [];
    const rawMin = fromScaleCoord(logMin, ctx);
    const rawMax = fromScaleCoord(logMax, ctx);
    if (rawMin <= 0 || rawMax <= 0) return ticks;

    const logLo = Math.log(rawMin);
    const logHi = Math.log(rawMax);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const logVal = logLo + ((logHi - logLo) * i) / steps;
      ticks.push(Math.log(Math.max(Math.exp(logVal), MIN_POSITIVE_PRICE)));
    }
    return ticks;
  }

  const step = (max - min) / 6;
  if (step <= 0) return [min];
  const ticks: number[] = [];
  for (let c = min; c <= max + step * 0.001; c += step) {
    if (Number.isFinite(c)) ticks.push(c);
  }
  return ticks;
}
