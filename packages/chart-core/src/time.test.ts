import { describe, it, expect } from 'vitest';
import { formatTimeDelta } from './time';

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

describe('formatTimeDelta', () => {
  it('formats intraday intervals as minutes when under one hour', () => {
    expect(formatTimeDelta(45 * MS_MIN, '15m')).toBe('45m');
    expect(formatTimeDelta(5 * MS_MIN, '1m')).toBe('5m');
  });

  it('formats intraday intervals as hours and minutes', () => {
    expect(formatTimeDelta(3 * MS_HOUR + 15 * MS_MIN, '15m')).toBe('3h 15m');
    expect(formatTimeDelta(2 * MS_HOUR, '1h')).toBe('2h');
  });

  it('formats daily interval as days', () => {
    expect(formatTimeDelta(12 * MS_DAY, '1d')).toBe('12d');
    expect(formatTimeDelta(-5 * MS_DAY, '1d')).toBe('-5d');
  });

  it('formats weekly interval as weeks and day remainder', () => {
    expect(formatTimeDelta(3 * MS_WEEK, '1wk')).toBe('3w');
    expect(formatTimeDelta(3 * MS_WEEK + 2 * MS_DAY, '1wk')).toBe('3w 2d');
  });

  it('formats monthly interval as months and day remainder', () => {
    expect(formatTimeDelta(2 * MS_MONTH, '1mo')).toBe('2mo');
    expect(formatTimeDelta(2 * MS_MONTH + 5 * MS_DAY, '1mo')).toBe('2mo 5d');
  });

  it('defaults to intraday-style formatting when interval is omitted', () => {
    expect(formatTimeDelta(90 * MS_MIN)).toBe('1h 30m');
  });
});
