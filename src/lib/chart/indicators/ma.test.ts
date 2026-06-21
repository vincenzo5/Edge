import { describe, it, expect } from 'vitest';
import { ma } from './ma';
import { sma } from './math';

describe('ma plugin', () => {
  it('compute matches hand-calculated SMA', () => {
    const closes = [10, 11, 12, 13, 14];
    const candles = closes.map((c, i) => ({ t: i, o: c, h: c, l: c, c, v: 100 }));
    const data = ma.compute!(candles, { period: 3 });
    expect(data.ma[0]).toBeNaN();
    expect(data.ma[1]).toBeNaN();
    expect(data.ma[2]).toBeCloseTo(11);
    expect(data.ma[4]).toBeCloseTo(13);
    expect(sma(closes, 3)[4]).toBeCloseTo(data.ma[4]);
  });
});
