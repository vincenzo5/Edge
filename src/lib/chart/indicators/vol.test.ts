import { describe, it, expect } from 'vitest';
import { vol } from './vol';
import { createViewport } from '../viewport';

const candles = [
  { t: 0, o: 10, h: 11, l: 9, c: 10.5, v: 1000 },
  { t: 1, o: 10.5, h: 11, l: 10, c: 10, v: 2000 },
  { t: 2, o: 10, h: 10.5, l: 9.5, c: 10.2, v: 1500 },
];

describe('VOL indicator', () => {
  it('compute returns volume series matching candle count', () => {
    const data = vol.compute!(candles);
    expect(data?.vol).toHaveLength(candles.length);
    expect(data?.vol[0]).toBe(1000);
    expect(data?.vol[1]).toBe(2000);
  });

  it('valueRangeForViewport uses visible volumes with zero floor', () => {
    const data = vol.compute!(candles);
    const vp = createViewport(candles, 400, 200);
    const range = vol.valueRangeForViewport!(candles, vp);
    expect(range).not.toBeNull();
    expect(range!.min).toBe(0);
    expect(range!.max).toBeGreaterThan(2000);
  });
});
