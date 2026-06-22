import { describe, it, expect } from 'vitest';
import type { Candle } from './contracts';
import {
  applyIntervalResample,
  resolveFetchInterval,
  resampleCandlesTo2h,
} from './intervalAdapter';

function candle(t: number, o: number, h: number, l: number, c: number, v = 100): Candle {
  return { t, o, h, l, c, v };
}

describe('resolveFetchInterval', () => {
  it('passes through native Yahoo intervals', () => {
    expect(resolveFetchInterval('1m')).toEqual({ providerInterval: '1m' });
    expect(resolveFetchInterval('1h')).toEqual({ providerInterval: '1h' });
  });

  it('maps 2h to 1h fetch with resample', () => {
    expect(resolveFetchInterval('2h')).toEqual({
      providerInterval: '1h',
      resampleTo: '2h',
    });
  });
});

describe('resampleCandlesTo2h', () => {
  it('merges pairs of 1h bars into 2h OHLCV', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0, 0);
    const hour = 60 * 60 * 1000;
    const candles: Candle[] = [
      candle(base, 10, 12, 9, 11, 100),
      candle(base + hour, 11, 13, 10, 12, 200),
      candle(base + 2 * hour, 12, 14, 11, 13, 150),
    ];
    const out = resampleCandlesTo2h(candles);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      t: base,
      o: 10,
      h: 13,
      l: 9,
      c: 12,
      v: 300,
    });
    expect(out[1]).toMatchObject({
      t: base + 2 * hour,
      o: 12,
      h: 14,
      l: 11,
      c: 13,
      v: 150,
    });
  });

  it('returns empty array for empty input', () => {
    expect(resampleCandlesTo2h([])).toEqual([]);
  });
});

describe('applyIntervalResample', () => {
  it('resamples when resampleTo is 2h', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0, 0);
    const hour = 60 * 60 * 1000;
    const candles = [
      candle(base, 10, 12, 9, 11),
      candle(base + hour, 11, 13, 10, 12),
    ];
    expect(applyIntervalResample(candles, '2h')).toHaveLength(1);
  });

  it('returns candles unchanged when no resample target', () => {
    const candles = [candle(1, 1, 2, 0, 1)];
    expect(applyIntervalResample(candles)).toBe(candles);
  });
});
