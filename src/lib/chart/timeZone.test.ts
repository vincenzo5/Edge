import { describe, expect, it } from 'vitest';
import {
  buildTimeZoneMenuOptions,
  exchangeToTimeZone,
  formatClockLabel,
  formatTimeZoneMenuLabel,
  normalizeChartTimeZone,
  resolveChartTimeZone,
} from './timeZone';

describe('normalizeChartTimeZone', () => {
  it('defaults invalid values to UTC', () => {
    expect(normalizeChartTimeZone(undefined)).toBe('UTC');
    expect(normalizeChartTimeZone('')).toBe('UTC');
    expect(normalizeChartTimeZone('Not/AZone')).toBe('UTC');
  });

  it('preserves UTC, exchange, and curated ids', () => {
    expect(normalizeChartTimeZone('UTC')).toBe('UTC');
    expect(normalizeChartTimeZone('exchange')).toBe('exchange');
    expect(normalizeChartTimeZone('America/New_York')).toBe('America/New_York');
  });
});

describe('resolveChartTimeZone', () => {
  it('resolves UTC and exchange sentinels', () => {
    expect(resolveChartTimeZone('UTC')).toBe('UTC');
    expect(resolveChartTimeZone('exchange', 'NASDAQ')).toBe('America/New_York');
    expect(resolveChartTimeZone('America/Chicago')).toBe('America/Chicago');
  });
});

describe('exchangeToTimeZone', () => {
  it('maps common US exchanges to New York', () => {
    expect(exchangeToTimeZone('NASDAQ')).toBe('America/New_York');
    expect(exchangeToTimeZone('LSE')).toBe('Europe/London');
    expect(exchangeToTimeZone('TSE')).toBe('Asia/Tokyo');
  });

  it('falls back for unknown exchanges', () => {
    expect(exchangeToTimeZone('UNKNOWN')).toBe('America/New_York');
    expect(exchangeToTimeZone(null)).toBe('America/New_York');
  });
});

describe('formatTimeZoneMenuLabel', () => {
  // Fixed instant: 2026-08-03 18:17:57 UTC (EDT = UTC-4)
  const at = new Date('2026-08-03T18:17:57.000Z');

  it('formats UTC and Exchange labels', () => {
    expect(formatTimeZoneMenuLabel('UTC', '', at)).toBe('UTC');
    expect(formatTimeZoneMenuLabel('exchange', '', at)).toBe('Exchange');
  });

  it('formats IANA zones with offset and city', () => {
    const label = formatTimeZoneMenuLabel('America/New_York', 'New York', at);
    expect(label).toMatch(/\(UTC-4\) New York/);
  });
});

describe('formatClockLabel', () => {
  const at = new Date('2026-08-03T18:17:57.000Z');

  it('formats UTC clock', () => {
    expect(formatClockLabel('UTC', null, at)).toBe('18:17:57 UTC');
  });

  it('formats exchange-relative clock', () => {
    const label = formatClockLabel('exchange', 'NASDAQ', at);
    expect(label).toBe('14:17:57 EDT');
  });
});

describe('buildTimeZoneMenuOptions', () => {
  it('includes UTC, Exchange, and curated zones', () => {
    const options = buildTimeZoneMenuOptions(new Date('2026-08-03T18:17:57.000Z'));
    expect(options[0]).toMatchObject({ id: 'UTC', label: 'UTC' });
    expect(options[1]).toMatchObject({ id: 'exchange', label: 'Exchange' });
    expect(options.some((o) => o.id === 'America/New_York')).toBe(true);
  });
});
