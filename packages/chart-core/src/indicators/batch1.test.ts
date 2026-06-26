import { describe, it, expect } from 'vitest';
import { vwap } from './vwap';
import { atr } from './atr';
import { kdj } from './kdj';
import { cci } from './cci';
import { obv } from './obv';
import {
  computeVwap,
  computeAtr,
  computeStochastic,
  computeCci,
  computeObv,
} from './math';

const candles = Array.from({ length: 30 }, (_, i) => ({
  t: i * 1000,
  o: 100 + i,
  h: 102 + i,
  l: 98 + i,
  c: 101 + i,
  v: 1000 + i * 10,
}));

describe('declarative indicator batch 1', () => {
  it('VWAP compute matches math helper', () => {
    const data = vwap.compute!(candles, {});
    const expected = computeVwap(candles);
    expect(data.vwap.at(-1)).toBeCloseTo(expected.at(-1)!);
    expect(data.vwap.at(-1)).toBeGreaterThan(0);
  });

  it('ATR compute matches math helper', () => {
    const data = atr.compute!(candles, { period: 14 });
    const expected = computeAtr(candles, 14);
    expect(data.atr.at(-1)).toBeCloseTo(expected.at(-1)!);
    expect(data.atr.at(-1)).toBeGreaterThan(0);
  });

  it('KDJ stochastic compute matches math helper', () => {
    const data = kdj.compute!(candles, { kPeriod: 9, dPeriod: 3 });
    const expected = computeStochastic(candles, 9, 3);
    expect(data.k.at(-1)).toBeCloseTo(expected.k.at(-1)!);
    expect(data.d.at(-1)).toBeCloseTo(expected.d.at(-1)!);
    expect(data.j.at(-1)).toBeCloseTo(expected.j.at(-1)!);
  });

  it('CCI compute matches math helper', () => {
    const data = cci.compute!(candles, { period: 20 });
    const expected = computeCci(candles, 20);
    expect(data.cci.at(-1)).toBeCloseTo(expected.at(-1)!);
  });

  it('OBV compute matches math helper', () => {
    const data = obv.compute!(candles, {});
    const expected = computeObv(candles);
    expect(data.obv.at(-1)).toBe(expected.at(-1)!);
    expect(data.obv.at(-1)).toBeGreaterThan(0);
  });
});
