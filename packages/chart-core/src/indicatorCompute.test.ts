import { describe, expect, it, beforeEach } from 'vitest';
import type { Candle } from './contracts';
import {
  clearComputeCache,
  computeCacheKey,
  computeTipStableCacheKey,
  candleTipRevisionFromSeries,
  getComputeCacheEntryCount,
  getComputedSeries,
} from './indicatorCompute';
import { applyCandleReplaceLatest } from './series';
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

  it('uses tip-stable identity without tip revision in cache key', () => {
    const key = computeCacheKey('MACD', { fast: 12 }, candles);
    expect(key).toBe(computeTipStableCacheKey('MACD', { fast: 12 }, candles));
    expect(key).not.toContain(candleTipRevisionFromSeries(candles));
  });

  it('does not grow cache entry count on repeated tip replace-latest ticks', () => {
    let series = [...candles];
    getComputedSeries(ma, series, { period: 2 });
    expect(getComputeCacheEntryCount()).toBe(1);

    for (let i = 0; i < 20; i += 1) {
      const last = series[series.length - 1]!;
      series = applyCandleReplaceLatest(series, {
        ...last,
        c: last.c + 0.1 * (i + 1),
        h: Math.max(last.h, last.c + 0.1 * (i + 1)),
      });
      getComputedSeries(ma, series, { period: 2 });
      expect(getComputeCacheEntryCount()).toBe(1);
    }
  });

  it('creates a new cache slot when candle count changes', () => {
    getComputedSeries(ma, candles, { period: 2 });
    getComputedSeries(ma, candles.slice(0, 2), { period: 2 });
    expect(getComputeCacheEntryCount()).toBe(2);
  });
});
