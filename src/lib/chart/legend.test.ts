import { describe, it, expect } from 'vitest';
import { resolveLegendBar } from './legend';
import type { Candle } from './contracts';

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11, v: 1000 },
  { t: 2, o: 11, h: 13, l: 10, c: 12, v: 2000 },
  { t: 3, o: 12, h: 14, l: 11, c: 11.8, v: 1500 },
];

describe('resolveLegendBar', () => {
  it('returns last candle when crosshair index is null', () => {
    const result = resolveLegendBar(candles, null);
    expect(result?.index).toBe(2);
    expect(result?.candle.c).toBe(11.8);
  });

  it('returns crosshair candle when index is valid', () => {
    const result = resolveLegendBar(candles, 1);
    expect(result?.index).toBe(1);
    expect(result?.candle.c).toBe(12);
  });

  it('computes change from previous close', () => {
    const result = resolveLegendBar(candles, 2);
    expect(result?.change).toBeCloseTo(-0.2);
    expect(result?.changePct).toBeCloseTo(-1.666, 2);
  });

  it('returns null for empty candles', () => {
    expect(resolveLegendBar([], null)).toBeNull();
  });

  it('falls back to last candle for out-of-range index', () => {
    const result = resolveLegendBar(candles, 99);
    expect(result?.index).toBe(2);
  });
});
