import { describe, it, expect } from 'vitest';
import { boll } from './boll';
import { computeBollinger } from './math';

describe('boll plugin', () => {
  it('compute produces upper/middle/lower bands', () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i);
    const candles = closes.map((c, i) => ({ t: i, o: c, h: c, l: c, c, v: 100 }));
    const data = boll.compute!(candles, { period: 20, std: 2 });
    const expected = computeBollinger(closes, 20, 2);

    expect(data.middle[24]).toBeCloseTo(expected.middle[24]!);
    expect(data.upper[24]).toBeCloseTo(expected.upper[24]!);
    expect(data.lower[24]).toBeCloseTo(expected.lower[24]!);
    expect(data.upper[24]).toBeGreaterThan(data.middle[24]!);
    expect(data.lower[24]).toBeLessThan(data.middle[24]!);
  });
});
