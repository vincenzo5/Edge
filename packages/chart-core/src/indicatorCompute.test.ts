import { describe, expect, it, beforeEach } from 'vitest';
import type { Candle } from './contracts';
import { clearComputeCache, getComputedSeries } from './indicatorCompute';
import { ma } from './indicators/ma';

const candles: Candle[] = [
  { t: 1000, o: 10, h: 10, l: 10, c: 10 },
  { t: 2000, o: 20, h: 20, l: 20, c: 20 },
  { t: 3000, o: 30, h: 30, l: 30, c: 30 },
];

describe('indicator compute cache', () => {
  beforeEach(() => {
    clearComputeCache();
  });

  it('recomputes when candle values change but timestamps match', () => {
    const shifted = candles.map((candle) => ({
      ...candle,
      o: candle.o + 100,
      h: candle.h + 100,
      l: candle.l + 100,
      c: candle.c + 100,
    }));

    const first = getComputedSeries(ma, candles, { period: 2 });
    const next = getComputedSeries(ma, shifted, { period: 2 });

    expect(first?.ma.at(-1)).toBe(25);
    expect(next?.ma.at(-1)).toBe(125);
  });
});
