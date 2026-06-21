import { describe, it, expect } from 'vitest';
import { emaPlugin } from './ema';
import { ema, sma } from './math';

describe('EMA indicator', () => {
  it('compute matches math.ema', () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8];
    const candles = closes.map((c, i) => ({
      t: i,
      o: c,
      h: c,
      l: c,
      c,
      v: 100,
    }));
    const data = emaPlugin.compute!(candles, { period: 3 });
    expect(data?.ema).toEqual(ema(closes, 3));
  });

  it('EMA differs from SMA for same period', () => {
    const closes = [10, 11, 12, 11, 10, 9, 10, 11, 12, 13];
    const candles = closes.map((c, i) => ({
      t: i,
      o: c,
      h: c,
      l: c,
      c,
      v: 100,
    }));
    const data = emaPlugin.compute!(candles, { period: 5 });
    expect(data?.ema[9]).not.toEqual(sma(closes, 5)[9]);
  });
});
