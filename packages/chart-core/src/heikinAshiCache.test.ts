import { describe, expect, it, beforeEach } from 'vitest';
import type { Candle } from './contracts';
import {
  clearHeikinAshiCache,
  getCachedHeikinAshi,
  HEIKIN_ASHI_CACHE_MAX_ENTRIES,
  setCachedHeikinAshi,
} from './heikinAshiCache';
import { toHeikinAshi } from './series';

const sample: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11 },
  { t: 2, o: 11, h: 13, l: 10, c: 12 },
];

describe('heikinAshiCache', () => {
  beforeEach(() => {
    clearHeikinAshiCache();
  });

  it('returns null on cache miss', () => {
    expect(getCachedHeikinAshi(sample)).toBeNull();
  });

  it('stores and returns frozen cached series', () => {
    const ha = toHeikinAshi(sample);
    const cached = getCachedHeikinAshi(sample);
    expect(cached).toBe(ha);
    expect(Object.isFrozen(cached)).toBe(true);
    expect(Object.isFrozen(cached![0]!)).toBe(true);
  });

  it('misses when source OHLCV changes', () => {
    toHeikinAshi(sample);
    const changed = [...sample, { t: 3, o: 12, h: 14, l: 11, c: 13 }];
    expect(getCachedHeikinAshi(changed)).toBeNull();
  });

  it('evicts oldest entries when over max entries', () => {
    for (let i = 0; i < HEIKIN_ASHI_CACHE_MAX_ENTRIES + 2; i += 1) {
      const candles: Candle[] = [{ t: i, o: i, h: i + 1, l: i - 1, c: i }];
      toHeikinAshi(candles);
    }
    expect(getCachedHeikinAshi([{ t: 0, o: 0, h: 1, l: -1, c: 0 }])).toBeNull();
    expect(
      getCachedHeikinAshi([
        {
          t: HEIKIN_ASHI_CACHE_MAX_ENTRIES + 1,
          o: HEIKIN_ASHI_CACHE_MAX_ENTRIES + 1,
          h: HEIKIN_ASHI_CACHE_MAX_ENTRIES + 2,
          l: HEIKIN_ASHI_CACHE_MAX_ENTRIES,
          c: HEIKIN_ASHI_CACHE_MAX_ENTRIES + 1,
        },
      ]),
    ).not.toBeNull();
  });

  it('clearHeikinAshiCache removes all entries', () => {
    toHeikinAshi(sample);
    expect(getCachedHeikinAshi(sample)).not.toBeNull();
    clearHeikinAshiCache();
    expect(getCachedHeikinAshi(sample)).toBeNull();
  });
});
