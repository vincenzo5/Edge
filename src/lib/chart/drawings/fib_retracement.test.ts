import { describe, it, expect } from 'vitest';
import { fibLevelPrice, FIB_LEVELS } from './fib_retracement';

describe('fib_retracement', () => {
  it('computes 0.618 level between anchors', () => {
    const p0 = 100;
    const p1 = 200;
    expect(fibLevelPrice(p0, p1, 0.618)).toBeCloseTo(161.8, 1);
    expect(FIB_LEVELS).toContain(0.618);
  });
});
