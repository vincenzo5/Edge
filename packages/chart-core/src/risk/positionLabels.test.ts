import { describe, it, expect } from 'vitest';
import {
  computeOpenPnl,
  computeRiskRewardRatio,
  formatEntryLabels,
  formatStopLabel,
  formatTargetLabel,
  resolvePositionQty,
} from './positionLabels';

const baseInput = {
  entry: 100,
  stop: 95,
  target: 110,
  leftTimestamp: 1000,
  rightTimestamp: 3000,
  direction: 'long' as const,
  qty: 2,
};

describe('positionLabels', () => {
  it('computes risk/reward ratio from box geometry', () => {
    expect(computeRiskRewardRatio(baseInput)).toBe(2);
  });

  it('formats target label with delta, percent, and amount', () => {
    const label = formatTargetLabel(baseInput);
    expect(label).toContain('Target:');
    expect(label).toContain('10');
    expect(label).toContain('Amount:');
    expect(label).toContain('20');
  });

  it('formats stop label with delta, percent, and amount', () => {
    const label = formatStopLabel(baseInput);
    expect(label).toContain('Stop:');
    expect(label).toContain('5');
    expect(label).toContain('Amount:');
    expect(label).toContain('10');
  });

  it('formats entry labels with open pnl and risk reward', () => {
    const [line1, line2] = formatEntryLabels({ ...baseInput, lastPrice: 105 });
    expect(line1).toContain('Open PnL:');
    expect(line1).toContain('Qty: 2');
    expect(line2).toContain('Risk/reward ratio: 2');
  });

  it('computes negative open pnl for long below entry', () => {
    expect(computeOpenPnl(100, 95, 2, 'long')).toBe(-10);
  });

  it('computes positive open pnl for short when price falls', () => {
    expect(computeOpenPnl(100, 95, 2, 'short')).toBe(10);
  });

  it('resolvePositionQty prefers stored qty', () => {
    expect(resolvePositionQty(5, 100)).toBe(5);
    expect(resolvePositionQty(undefined, 100)).toBe(100);
    expect(resolvePositionQty(undefined, undefined)).toBe(1);
  });
});
