import { describe, it, expect } from 'vitest';
import { resolvePaneLabel } from './paneLabels';
import type { IndicatorConfig } from './contracts';

const indicators: IndicatorConfig[] = [
  { id: 'rsi1', name: 'RSI', pane: 'sub', params: { period: 14 }, visible: true },
  { id: 'macd1', name: 'MACD', pane: 'sub', params: {}, visible: true },
];

describe('resolvePaneLabel', () => {
  it('returns Price for price pane', () => {
    expect(resolvePaneLabel('price', indicators)).toBe('Price');
  });

  it('returns indicator name for sub-pane id', () => {
    expect(resolvePaneLabel('rsi1', indicators)).toBe('RSI');
  });

  it('falls back to pane id when indicator missing', () => {
    expect(resolvePaneLabel('orphan', indicators)).toBe('orphan');
  });
});
