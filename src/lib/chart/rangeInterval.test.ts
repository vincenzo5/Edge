import { describe, it, expect } from 'vitest';
import { BOTTOM_RANGE_PRESETS } from './rangePresets';
import { intervalForRange, rangeForManualInterval, resolveCellFetchRange } from './rangeInterval';

describe('intervalForRange', () => {
  it('maps short presets to intraday intervals', () => {
    expect(intervalForRange('1d')).toBe('1m');
    expect(intervalForRange('5d')).toBe('5m');
    expect(intervalForRange('1mo')).toBe('30m');
  });

  it('maps medium presets to hourly intervals', () => {
    expect(intervalForRange('3mo')).toBe('1h');
    expect(intervalForRange('6mo')).toBe('2h');
  });

  it('maps longer presets to daily, weekly, and monthly bars', () => {
    expect(intervalForRange('ytd')).toBe('1d');
    expect(intervalForRange('1y')).toBe('1d');
    expect(intervalForRange('5y')).toBe('1wk');
    expect(intervalForRange('max')).toBe('1mo');
  });

  it('covers every bottom-bar preset', () => {
    const expected: Partial<Record<(typeof BOTTOM_RANGE_PRESETS)[number], string>> = {
      '1d': '1m',
      '5d': '5m',
      '1mo': '30m',
      '3mo': '1h',
      '6mo': '2h',
      ytd: '1d',
      '1y': '1d',
      '5y': '1wk',
      max: '1mo',
    };
    for (const preset of BOTTOM_RANGE_PRESETS) {
      expect(intervalForRange(preset)).toBe(expected[preset]);
    }
  });
});

describe('rangeForManualInterval', () => {
  it('uses max history for monthly bars', () => {
    expect(rangeForManualInterval('1mo')).toBe('max');
  });

  it('uses five-year history for weekly bars', () => {
    expect(rangeForManualInterval('1wk')).toBe('5y');
  });

  it('uses one-year history for daily and intraday bars', () => {
    expect(rangeForManualInterval('1d')).toBe('1y');
    expect(rangeForManualInterval('1h')).toBe('1y');
    expect(rangeForManualInterval('5m')).toBe('1y');
  });
});

describe('resolveCellFetchRange', () => {
  it('widens stale one-year monthly cells to max', () => {
    expect(
      resolveCellFetchRange({ range: '1y', interval: '1mo', rangePreset: null }),
    ).toBe('max');
  });

  it('widens stale one-year weekly cells to five years', () => {
    expect(
      resolveCellFetchRange({ range: '1y', interval: '1wk', rangePreset: null }),
    ).toBe('5y');
  });

  it('respects active bottom-bar presets', () => {
    expect(
      resolveCellFetchRange({ range: '1mo', interval: '1mo', rangePreset: '1mo' }),
    ).toBe('1mo');
  });

  it('keeps explicit long ranges for weekly bars', () => {
    expect(
      resolveCellFetchRange({ range: 'max', interval: '1wk', rangePreset: null }),
    ).toBe('max');
  });
});
