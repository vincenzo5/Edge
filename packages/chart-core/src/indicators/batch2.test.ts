import { describe, it, expect } from 'vitest';
import { dmi } from './dmi';
import { wr } from './wr';
import { roc } from './roc';
import { supertrend } from './supertrend';
import { getCatalog } from './registry';
import {
  computeDmi,
  computeWilliamsR,
  computeRoc,
  computeSupertrend,
  closes,
} from './math';

const candles = Array.from({ length: 30 }, (_, i) => ({
  t: i * 1000,
  o: 100 + i,
  h: 102 + i,
  l: 98 + i,
  c: 101 + i,
  v: 1000 + i * 10,
}));

describe('declarative indicator batch 2', () => {
  it('DMI compute matches math helper', () => {
    const data = dmi.compute!(candles, { period: 14 });
    const expected = computeDmi(candles, 14);
    expect(data.plusDi.at(-1)).toBeCloseTo(expected.plusDi.at(-1)!);
    expect(data.minusDi.at(-1)).toBeCloseTo(expected.minusDi.at(-1)!);
    expect(data.adx.at(-1)).toBeCloseTo(expected.adx.at(-1)!);
    expect(data.adx.at(-1)).toBeGreaterThan(0);
  });

  it('WR compute matches math helper', () => {
    const data = wr.compute!(candles, { period: 14 });
    const expected = computeWilliamsR(candles, 14);
    expect(data.wr.at(-1)).toBeCloseTo(expected.at(-1)!);
    expect(data.wr.at(-1)).toBeLessThanOrEqual(0);
    expect(data.wr.at(-1)).toBeGreaterThanOrEqual(-100);
  });

  it('ROC compute matches math helper', () => {
    const data = roc.compute!(candles, { period: 12 });
    const expected = computeRoc(closes(candles), 12);
    expect(data.roc.at(-1)).toBeCloseTo(expected.at(-1)!);
    expect(data.roc.at(-1)).toBeGreaterThan(0);
  });

  it('Supertrend compute matches math helper', () => {
    const data = supertrend.compute!(candles, { atrPeriod: 10, multiplier: 3 });
    const expected = computeSupertrend(candles, 10, 3);
    expect(data.supertrend.at(-1)).toBeCloseTo(expected.supertrend.at(-1)!);
    expect(data.direction.at(-1)).toBe(expected.direction.at(-1)!);
    expect(data.supertrend.at(-1)).toBeGreaterThan(0);
  });

  it('batch 2 indicators are implemented in catalog', () => {
    const catalog = getCatalog();
    for (const name of ['DMI', 'WR', 'ROC', 'Supertrend']) {
      const entry = catalog.find((e) => e.name === name);
      expect(entry?.implemented).toBe(true);
    }
  });
});
