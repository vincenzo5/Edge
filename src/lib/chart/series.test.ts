import { describe, it, expect } from 'vitest';
import {
  normalizeCandle,
  isValidCandle,
  validateCandles,
  toHeikinAshi,
  applyVisibleSlice,
} from './series';
import type { Candle } from './contracts';

describe('normalizeCandle', () => {
  it('maps long-form Yahoo keys to canonical short form', () => {
    const raw = { timestamp: 1, open: 10, high: 11, low: 9, close: 10.5, volume: 100 };
    const out = normalizeCandle(raw);
    expect(out).toEqual({ t: 1, o: 10, h: 11, l: 9, c: 10.5, v: 100 });
  });

  it('maps short-form keys as-is', () => {
    const raw = { t: 2, o: 20, h: 21, l: 19, c: 20.5, v: 200 };
    const out = normalizeCandle(raw);
    expect(out).toEqual({ t: 2, o: 20, h: 21, l: 19, c: 20.5, v: 200 });
  });

  it('defaults missing numeric fields to 0', () => {
    const out = normalizeCandle({});
    expect(out).toEqual({ t: 0, o: 0, h: 0, l: 0, c: 0, v: undefined });
  });
});

describe('isValidCandle', () => {
  it('returns true for valid canonical candle', () => {
    expect(isValidCandle({ t: 1, o: 1, h: 2, l: 0, c: 1 })).toBe(true);
  });

  it('returns false for missing fields or wrong types', () => {
    expect(isValidCandle(null)).toBe(false);
    expect(isValidCandle({ t: 1, o: 1, h: 2, l: 0 })).toBe(false); // missing c
    expect(isValidCandle({ t: '1', o: 1, h: 2, l: 0, c: 1 })).toBe(false);
  });
});

describe('validateCandles', () => {
  it('normalizes and returns valid array', () => {
    const input = [
      { timestamp: 1000, open: 10, high: 12, low: 9, close: 11 },
      { t: 2000, o: 11, h: 13, l: 10, c: 12 },
    ];
    const out = validateCandles(input);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ t: 1000, o: 10, h: 12, l: 9, c: 11, v: undefined });
  });

  it('throws on non-array input', () => {
    expect(() => validateCandles({})).toThrow(/expected array/);
  });

  it('throws on invalid candle data (non-numeric field)', () => {
    expect(() => validateCandles([{ timestamp: 1, open: 'bad' } as any])).toThrow(/invalid candle at index 0/);
  });
});

describe('toHeikinAshi', () => {
  it('transforms a simple series correctly', () => {
    const input: Candle[] = [
      { t: 1, o: 10, h: 12, l: 9, c: 11 },
      { t: 2, o: 11, h: 13, l: 10, c: 12 },
    ];
    const ha = toHeikinAshi(input);
    expect(ha).toHaveLength(2);
    // First HA: open=(10+11)/2=10.5, close=(10+12+9+11)/4=10.5
    expect(ha[0].o).toBeCloseTo(10.5);
    expect(ha[0].c).toBeCloseTo(10.5);
    // Second HA open = (10.5 + 10.5)/2 = 10.5
    expect(ha[1].o).toBeCloseTo(10.5);
    expect(ha[1].c).toBeCloseTo(11.5);
  });

  it('returns empty array for empty input', () => {
    expect(toHeikinAshi([])).toEqual([]);
  });
});

describe('applyVisibleSlice', () => {
  const data: Candle[] = Array.from({ length: 10 }, (_, i) => ({ t: i, o: i, h: i + 1, l: i - 1, c: i }));

  it('returns full data when visibleCount is null or <=0', () => {
    expect(applyVisibleSlice(data, null)).toHaveLength(10);
    expect(applyVisibleSlice(data, 0)).toHaveLength(10);
  });

  it('slices from the start when visibleCount is positive', () => {
    expect(applyVisibleSlice(data, 3)).toHaveLength(3);
    expect(applyVisibleSlice(data, 3)[2].t).toBe(2);
  });
});
