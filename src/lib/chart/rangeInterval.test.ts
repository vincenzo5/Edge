import { describe, it, expect } from 'vitest';
import { BOTTOM_RANGE_PRESETS } from './rangePresets';
import { intervalForRange } from './rangeInterval';

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
