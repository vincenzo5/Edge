import { describe, expect, it } from 'vitest';
import type { SerializedDrawing } from '../contracts';
import {
  inferPositionTickSize,
  levelsAfterEntryChange,
  priceFromEntryTicks,
  readPositionSettingsDraft,
  ticksBetweenPrices,
} from './positionSettingsInputs';

const longDrawing: SerializedDrawing = {
  id: 'd-long',
  name: 'long_position',
  label: 'Long',
  points: [
    { timestamp: 1_000, value: 100, dataIndex: 0 },
    { timestamp: 1_000, value: 95, dataIndex: 0 },
    { timestamp: 1_000, value: 110, dataIndex: 0 },
    { timestamp: 2_000, value: 100, dataIndex: 1 },
  ],
  visible: true,
  locked: false,
  zLevel: 1,
  paneId: 'price',
  styles: { riskPercent: 2.5 },
};

describe('positionSettingsInputs', () => {
  it('infers tick size from entry magnitude', () => {
    expect(inferPositionTickSize(100)).toBe(0.01);
    expect(inferPositionTickSize(29000)).toBe(0.25);
  });

  it('reads draft levels and risk percent from a long position', () => {
    const draft = readPositionSettingsDraft(longDrawing);
    expect(draft).toMatchObject({
      entry: 100,
      stop: 95,
      target: 110,
      riskPercent: 2.5,
      riskUnit: 'percent',
      tickSize: 0.01,
    });
  });

  it('converts ticks ↔ prices for long stop/target', () => {
    expect(ticksBetweenPrices(100, 95, 0.01)).toBe(500);
    expect(priceFromEntryTicks(100, 500, 0.01, 'long', 'stop')).toBeCloseTo(95, 8);
    expect(priceFromEntryTicks(100, 1000, 0.01, 'long', 'target')).toBeCloseTo(110, 8);
  });

  it('preserves tick offsets when entry moves', () => {
    const next = levelsAfterEntryChange(
      { entry: 100, stop: 95, target: 110 },
      102,
      0.01,
      'long',
    );
    expect(next.entry).toBe(102);
    expect(next.stop).toBeCloseTo(97, 8);
    expect(next.target).toBeCloseTo(112, 8);
  });
});
