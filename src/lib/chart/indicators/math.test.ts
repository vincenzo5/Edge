import { describe, it, expect } from 'vitest';
import { computeMacd, ema, mergeRanges, symmetricRangeAroundZero } from './math';

describe('indicator math', () => {
  it('computes EMA with warmup period', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ema(values, 3);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result[2]).toBe(2);
    expect(result[9]).toBeGreaterThan(result[2]);
  });

  it('computes MACD histogram as macd minus signal', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const { macd, signal, histogram } = computeMacd(closes, 12, 26, 9);
    const i = closes.length - 1;
    expect(histogram[i]).toBeCloseTo(macd[i] - signal[i], 5);
  });

  it('symmetricRangeAroundZero centers on zero using the larger absolute extreme', () => {
    const asymmetric = mergeRanges([{ min: -4.03, max: 8.2 }]);
    expect(symmetricRangeAroundZero(asymmetric)).toEqual({ min: -8.2, max: 8.2 });
  });

  it('symmetricRangeAroundZero falls back when range is flat at zero', () => {
    expect(symmetricRangeAroundZero({ min: 0, max: 0 })).toEqual({ min: -1, max: 1 });
  });
});
