import { describe, it, expect } from 'vitest';
import { formatAxisTime } from './time';
import { toTimestampMs } from './series';

// Local noon avoids UTC/local date boundary issues in assertions.
const KNOWN_DATE_MS = new Date(2024, 5, 15, 12, 0, 0).getTime();

describe('formatAxisTime', () => {
  it('formats daily intervals with weekday and short date', () => {
    const label = formatAxisTime(KNOWN_DATE_MS, '1d');
    expect(label).toMatch(/Sat 15 Jun '24/);
    expect(label).not.toMatch(/1970/);
  });

  it('formats intraday intervals with date and time', () => {
    const label = formatAxisTime(KNOWN_DATE_MS, '5m');
    expect(label).toMatch(/Jun/);
    expect(label).toMatch(/12:00/);
    expect(label).not.toMatch(/1970/);
  });

  it('defaults to daily-style when interval is omitted', () => {
    const label = formatAxisTime(KNOWN_DATE_MS);
    expect(label).toMatch(/Jun '24/);
  });

  it('returns empty string for zero timestamp', () => {
    expect(formatAxisTime(0)).toBe('');
  });

  it('formats Yahoo seconds after normalization without 1970 dates', () => {
    const ms = toTimestampMs(1718452800); // Jun 15 2024 UTC in seconds
    const label = formatAxisTime(ms, '1d');
    expect(label).not.toMatch(/1970/);
  });
});
