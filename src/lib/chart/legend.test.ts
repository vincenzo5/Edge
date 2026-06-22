import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveLegendBar,
  resolveLegendIndex,
  resolvePriceLegend,
  resolveIndicatorLegend,
} from './legend';
import { registerIndicator } from './indicators/registry';
import { clearComputeCache } from './indicatorCompute';
import type { Candle } from './contracts';
import type { IndicatorPlugin } from './plugin-api';

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11, v: 1000 },
  { t: 2, o: 11, h: 13, l: 10, c: 12, v: 2000 },
  { t: 3, o: 12, h: 14, l: 11, c: 11.8, v: 1500 },
];

describe('resolveLegendIndex', () => {
  it('returns last index when crosshair index is null', () => {
    expect(resolveLegendIndex(candles, null)).toBe(2);
  });

  it('returns crosshair index when valid', () => {
    expect(resolveLegendIndex(candles, 1)).toBe(1);
  });

  it('returns null for empty candles', () => {
    expect(resolveLegendIndex([], null)).toBeNull();
  });

  it('falls back to last index for out-of-range index', () => {
    expect(resolveLegendIndex(candles, 99)).toBe(2);
  });
});

describe('resolveLegendBar', () => {
  it('returns last candle when crosshair index is null', () => {
    const result = resolveLegendBar(candles, null);
    expect(result?.index).toBe(2);
    expect(result?.candle.c).toBe(11.8);
  });

  it('returns crosshair candle when index is valid', () => {
    const result = resolveLegendBar(candles, 1);
    expect(result?.index).toBe(1);
    expect(result?.candle.c).toBe(12);
  });

  it('computes change from previous close', () => {
    const result = resolveLegendBar(candles, 2);
    expect(result?.change).toBeCloseTo(-0.2);
    expect(result?.changePct).toBeCloseTo(-1.666, 2);
  });

  it('returns null for empty candles', () => {
    expect(resolveLegendBar([], null)).toBeNull();
  });

  it('falls back to last candle for out-of-range index', () => {
    const result = resolveLegendBar(candles, 99);
    expect(result?.index).toBe(2);
  });
});

describe('resolvePriceLegend', () => {
  it('includes OHLC value sections with tooltips', () => {
    const sections = resolvePriceLegend({
      symbol: 'AAPL',
      symbolName: 'Apple Inc.',
      exchange: 'NASDAQ',
      interval: '1d',
      candles,
      dataIndex: 1,
    });

    expect(sections).not.toBeNull();
    const valueIds = sections!
      .filter((s) => s.kind === 'value')
      .map((s) => (s.kind === 'value' ? s.id : ''));

    expect(valueIds).toEqual(['open', 'high', 'low', 'close', 'change']);

    const open = sections!.find((s) => s.kind === 'value' && s.id === 'open');
    expect(open?.kind === 'value' && open.value).toBe('11');
    expect(open?.kind === 'value' && open.tooltip).toContain('Open');
  });

  it('returns null for empty candles', () => {
    expect(
      resolvePriceLegend({
        symbol: 'AAPL',
        interval: '1d',
        candles: [],
        dataIndex: null,
      }),
    ).toBeNull();
  });
});

import type { IndicatorCategory } from './plugin-api';

function testIndicator(
  name: string,
  pane: 'main' | 'sub',
): { id: string; name: string; pane: 'main' | 'sub' } {
  return { id: `${name}-${pane}`, name, pane };
}

describe('resolveIndicatorLegend', () => {
  beforeEach(() => {
    clearComputeCache();
  });

  it('returns MACD title and three value sections via outputs', () => {
    const sections = resolveIndicatorLegend(
      testIndicator('MACD', 'sub'),
      candles,
      2,
      'dark',
    );

    expect(sections).not.toBeNull();
    expect(sections![0].kind).toBe('text');
    expect(sections![0].kind === 'text' && sections![0].text).toContain('MACD');

    const values = sections!.filter((s) => s.kind === 'value');
    expect(values).toHaveLength(3);
    expect(values.map((s) => (s.kind === 'value' ? s.id : ''))).toEqual([
      'macd',
      'signal',
      'histogram',
    ]);
  });

  it('returns null for unknown indicator', () => {
    expect(
      resolveIndicatorLegend(testIndicator('UNKNOWN', 'sub'), candles, null, 'dark'),
    ).toBeNull();
  });

  it('returns RSI title and value via outputs', () => {
    const sections = resolveIndicatorLegend(
      testIndicator('RSI', 'sub'),
      candles,
      2,
      'dark',
    );
    expect(sections).not.toBeNull();
    expect(sections!.filter((s) => s.kind === 'value')).toHaveLength(1);
    expect(sections![0].kind === 'text' && sections![0].text).toContain('RSI');
  });

  it('prefers legendAt override over outputs', () => {
    const overridePlugin: IndicatorPlugin = {
      name: 'LegendOverrideTest',
      category: 'Momentum',
      description: 'Test override',
      pane: 'sub',
      compute: () => ({ x: [10] }),
      outputs: [{ id: 'x', label: 'X', key: 'x' }],
      legendAt: () => [{ id: 'custom', label: 'Custom', value: 99 }],
      draw: () => {},
    };
    registerIndicator(overridePlugin);

    const sections = resolveIndicatorLegend(
      testIndicator('LegendOverrideTest', 'sub'),
      candles,
      0,
      'dark',
    );
    const values = sections!.filter((s) => s.kind === 'value');
    expect(values).toHaveLength(1);
    expect(values[0].kind === 'value' && values[0].id).toBe('custom');
    expect(values[0].kind === 'value' && values[0].value).toBe('99');
  });
});
