import { describe, it, expect } from 'vitest';

import {
  computeRiskMetrics,
  inferDirection,
  normalizeTargetAllocations,
  targetPriceForRMultiple,
} from './riskCompute';
import type { TradeSetup } from './riskTypes';

const longSetup: TradeSetup = {
  direction: 'long',
  account: { capital: 50_000, riskPercent: 1 },
  entries: [{ price: 100 }],
  stops: [{ price: 95, type: 'initial' }],
  targets: [
    { price: 105, rMultiple: 1 },
    { price: 110, rMultiple: 2 },
    { price: 115, rMultiple: 3 },
  ],
};

describe('riskCompute', () => {
  it('infers long direction when stop is below entry', () => {
    expect(inferDirection(100, 95)).toBe('long');
  });

  it('infers short direction when stop is above entry', () => {
    expect(inferDirection(100, 105)).toBe('short');
  });

  it('computes position size from account risk and stop distance', () => {
    const metrics = computeRiskMetrics(longSetup);
    expect(metrics.riskPerShare).toBe(5);
    expect(metrics.accountRiskDollars).toBe(500);
    expect(metrics.positionSize).toBe(100);
    expect(metrics.totalRiskDollars).toBe(500);
  });

  it('computes target prices for R multiples', () => {
    expect(targetPriceForRMultiple(100, 95, 'long', 1)).toBe(105);
    expect(targetPriceForRMultiple(100, 105, 'short', 2)).toBe(90);
  });

  it('splits allocations evenly when not specified', () => {
    expect(normalizeTargetAllocations(longSetup.targets)).toEqual([
      100 / 3,
      100 / 3,
      100 / 3,
    ]);
  });

  it('reports max R multiple as risk-reward ratio', () => {
    const metrics = computeRiskMetrics(longSetup);
    expect(metrics.riskRewardRatio).toBe(3);
    expect(metrics.targets).toHaveLength(3);
    expect(metrics.targets[0]?.rewardPerShare).toBe(5);
  });

  it('throws when setup fails validation', () => {
    expect(() =>
      computeRiskMetrics({
        ...longSetup,
        direction: 'long',
        stops: [{ price: 105, type: 'initial' }],
      }),
    ).toThrow(/Invalid trade setup/i);
  });
});
