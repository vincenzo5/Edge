import { describe, it, expect } from 'vitest';
import { getCatalog, INDICATOR_CATALOG } from './registry';

describe('indicator catalog', () => {
  it('lists 27 catalog entries', () => {
    expect(INDICATOR_CATALOG).toHaveLength(27);
    expect(getCatalog()).toHaveLength(27);
  });

  it('marks MA, BOLL, MACD, RSI, EMA, and VOL as implemented', () => {
    const catalog = getCatalog();
    const implemented = catalog.filter((e) => e.implemented).map((e) => e.name);
    expect(implemented).toEqual(expect.arrayContaining(['MA', 'BOLL', 'MACD', 'RSI', 'EMA', 'VOL']));
    expect(implemented).toHaveLength(6);
  });

  it('marks unimplemented catalog entries as not implemented', () => {
    const sma = getCatalog().find((e) => e.name === 'SMA');
    expect(sma?.implemented).toBe(false);
  });
});
