import { describe, it, expect } from 'vitest';
import { rsi } from './rsi';
import { computeRsi } from './math';

describe('rsi plugin', () => {
  it('compute stays within 0-100 after warmup', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const candles = closes.map((c, i) => ({ t: i, o: c, h: c, l: c, c, v: 100 }));
    const data = rsi.compute!(candles, { period: 14 });
    const expected = computeRsi(closes, 14);

    for (let i = 14; i < closes.length; i++) {
      expect(data.rsi[i]).toBeCloseTo(expected[i]!);
      expect(data.rsi[i]).toBeGreaterThanOrEqual(0);
      expect(data.rsi[i]).toBeLessThanOrEqual(100);
    }
  });

  it('has NaN warmup bars', () => {
    const closes = [10, 11, 12, 13, 14, 15];
    const candles = closes.map((c, i) => ({ t: i, o: c, h: c, l: c, c, v: 100 }));
    const data = rsi.compute!(candles, { period: 14 });
    expect(data.rsi[0]).toBeNaN();
  });
});
