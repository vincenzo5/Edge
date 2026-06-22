import { describe, expect, it } from 'vitest';
import type { Candle } from './contracts';
import {
  buildPriceScaleContext,
  computeScaleRange,
  formatScaleLabel,
  fromScaleCoord,
  resolveAnchorPrice,
  toScaleCoord,
} from './priceScaleTransform';

const candles: Candle[] = [
  { t: 1, o: 100, h: 105, l: 98, c: 102, v: 1000 },
  { t: 2, o: 102, h: 110, l: 101, c: 108, v: 1100 },
  { t: 3, o: 108, h: 112, l: 106, c: 110, v: 900 },
];

describe('priceScaleTransform', () => {
  const types = ['linear', 'log', 'percent', 'indexed'] as const;

  it.each(types)('round-trips raw price for %s', (type) => {
    const ctx = buildPriceScaleContext(type, candles, 0);
    const price = 105;
    const coord = toScaleCoord(price, ctx);
    expect(fromScaleCoord(coord, ctx)).toBeCloseTo(price, 4);
  });

  it('clamps non-positive prices for log without NaN', () => {
    const ctx = buildPriceScaleContext('log', candles, 0);
    expect(Number.isFinite(toScaleCoord(0, ctx))).toBe(true);
    expect(Number.isFinite(toScaleCoord(-5, ctx))).toBe(true);
  });

  it('percent anchor shifts coord but not raw price storage semantics', () => {
    const ctx0 = buildPriceScaleContext('percent', candles, 0);
    const ctx1 = buildPriceScaleContext('percent', candles, 1);
    const price = 110;
    expect(toScaleCoord(price, ctx0)).not.toBeCloseTo(toScaleCoord(price, ctx1), 1);
    expect(fromScaleCoord(toScaleCoord(price, ctx0), ctx0)).toBeCloseTo(price, 4);
  });

  it('resolveAnchorPrice uses first visible bar close', () => {
    expect(resolveAnchorPrice(candles, 0)).toBe(102);
    expect(resolveAnchorPrice(candles, 1)).toBe(108);
  });

  it('computeScaleRange on fixture produces ordered min/max', () => {
    const ctx = buildPriceScaleContext('linear', candles, 0);
    const { min, max } = computeScaleRange(candles, 0, 3, ctx);
    expect(min).toBeLessThan(max);
    expect(min).toBeLessThan(98);
    expect(max).toBeGreaterThan(112);
  });

  it('formatScaleLabel for percent includes sign', () => {
    const ctx = buildPriceScaleContext('percent', candles, 0);
    expect(formatScaleLabel(2.5, ctx)).toBe('+2.5%');
    expect(formatScaleLabel(-1.05, ctx)).toBe('-1.05%');
  });
});
