import { describe, it, expect } from 'vitest';
import { getCatalog, INDICATOR_CATALOG } from './registry';

describe('indicator catalog', () => {
  it('lists 30 catalog entries', () => {
    expect(INDICATOR_CATALOG).toHaveLength(30);
    expect(getCatalog()).toHaveLength(30);
  });

  it('marks declarative indicator batches as implemented', () => {
    const catalog = getCatalog();
    const implemented = catalog.filter((e) => e.implemented).map((e) => e.name);
    expect(implemented).toEqual(
      expect.arrayContaining([
        'MA',
        'BOLL',
        'MACD',
        'RSI',
        'EMA',
        'VOL',
        'VWAP',
        'ATR',
        'KDJ',
        'CCI',
        'OBV',
        'DMI',
        'WR',
        'ROC',
        'Supertrend',
      ]),
    );
    expect(implemented).toHaveLength(15);
  });

  it('marks unimplemented catalog entries as not implemented', () => {
    const sma = getCatalog().find((e) => e.name === 'SMA');
    expect(sma?.implemented).toBe(false);
  });
});
