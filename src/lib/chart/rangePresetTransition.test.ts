import { describe, it, expect } from 'vitest';
import { DEFAULT_CELL, DEFAULT_CHART_RANGE } from '@/lib/chartConfig';
import {
  applyRangePresetSelect,
  buildCandleSessionKey,
  resolveViewportRevision,
} from './rangePresetTransition';

describe('applyRangePresetSelect', () => {
  it('selecting a preset sets range, interval, and rangePreset', () => {
    const next = applyRangePresetSelect(DEFAULT_CELL, '1d');
    expect(next.rangePreset).toBe('1d');
    expect(next.range).toBe('1d');
    expect(next.interval).toBe('1m');
  });

  it('deselecting active preset restores default chart range', () => {
    const active = { ...DEFAULT_CELL, range: '1d', interval: '1m', rangePreset: '1d' as const };
    const deselected = applyRangePresetSelect(active, '1d');
    expect(deselected.rangePreset).toBeNull();
    expect(deselected.range).toBe(DEFAULT_CHART_RANGE.range);
    expect(deselected.interval).toBe(DEFAULT_CHART_RANGE.interval);
  });

  it('switching presets updates range and interval together', () => {
    const active = { ...DEFAULT_CELL, range: '1d', interval: '1m', rangePreset: '1d' as const };
    const next = applyRangePresetSelect(active, '5d');
    expect(next.rangePreset).toBe('5d');
    expect(next.range).toBe('5d');
    expect(next.interval).toBe('5m');
  });
});

describe('buildCandleSessionKey', () => {
  it('excludes rangePreset from session identity', () => {
    expect(buildCandleSessionKey('AAPL', '1y', '1d')).toBe('AAPL|1y|1d');
  });
});

describe('resolveViewportRevision', () => {
  const candleKey = 'AAPL|1y|1d';

  it('returns empty revision before candles load', () => {
    expect(resolveViewportRevision(0, null, candleKey, candleKey)).toBe(`empty|${candleKey}`);
  });

  it('returns undefined while loaded candles belong to a previous session', () => {
    expect(resolveViewportRevision(100, 'AAPL|1d|1m', candleKey, candleKey)).toBeUndefined();
  });

  it('returns candle session key when loaded candles match config', () => {
    expect(resolveViewportRevision(100, candleKey, candleKey, candleKey)).toBe(candleKey);
  });

  it('does not change revision when only rangePreset would differ', () => {
    expect(resolveViewportRevision(100, candleKey, candleKey, candleKey)).toBe(candleKey);
  });
});
