import { describe, it, expect } from 'vitest';
import type { Candle, VisibleRange } from './contracts';
import {
  computeTimeAxisTicks,
  formatCrosshairTime,
  pickTickUnit,
  visibleTimeBounds,
} from './timeAxis';
import { PRICE_AXIS_WIDTH } from './layout';

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

function makeDailyCandles(start: Date, count: number): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const t = start.getTime() + i * MS_DAY;
    candles.push({ t, o: 100, h: 101, l: 99, c: 100 });
  }
  return candles;
}

function vpForCandles(candles: Candle[], width = 600): VisibleRange {
  const n = candles.length;
  return {
    startIndex: 0,
    endIndex: n,
    priceMin: 90,
    priceMax: 110,
    width,
    height: 200,
    xForIndex: (i) => ((width - PRICE_AXIS_WIDTH) * i) / n,
    yForPrice: () => 50,
    indexForX: (x) => Math.floor((x / (width - PRICE_AXIS_WIDTH)) * n),
    priceForY: () => 100,
  };
}

describe('pickTickUnit', () => {
  it('uses minutes for very short spans', () => {
    expect(pickTickUnit(2 * MS_HOUR, '5m', 6).kind).toBe('minute');
  });

  it('uses months for multi-month daily spans', () => {
    expect(pickTickUnit(180 * MS_DAY, '1d', 6).kind).toBe('month');
  });

  it('uses years for very long spans', () => {
    expect(pickTickUnit(8 * 365 * MS_DAY, '1mo', 6).kind).toBe('year');
  });
});

describe('computeTimeAxisTicks', () => {
  it('includes a year label and month abbreviations for daily multi-month span', () => {
    const candles = makeDailyCandles(new Date(2026, 0, 1), 180);
    const vp = vpForCandles(candles);
    const ticks = computeTimeAxisTicks(candles, vp, '1d', 600);
    expect(ticks.some((t) => t.kind === 'year' && t.label === '2026')).toBe(true);
    expect(ticks.some((t) => t.label === 'Feb')).toBe(true);
    expect(ticks.some((t) => t.label === 'Mar')).toBe(true);
  });

  it('respects minimum label gap', () => {
    const candles = makeDailyCandles(new Date(2026, 0, 1), 365);
    const vp = vpForCandles(candles, 300);
    const ticks = computeTimeAxisTicks(candles, vp, '1d', 300);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.x - ticks[i - 1]!.x).toBeGreaterThanOrEqual(47);
    }
  });
});

describe('visibleTimeBounds', () => {
  it('interpolates timestamps across the visible index window', () => {
    const candles = makeDailyCandles(new Date(2026, 0, 1), 10);
    const bounds = visibleTimeBounds(candles, 0, 10);
    expect(bounds?.startMs).toBe(candles[0]!.t);
    expect(bounds?.endMs).toBe(candles[9]!.t);
  });
});

describe('formatCrosshairTime', () => {
  const ms = new Date(2026, 6, 30, 14, 35, 0).getTime();

  it('formats intraday with time', () => {
    const label = formatCrosshairTime(ms, '5m');
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/14:35/);
  });

  it('formats daily without clock time', () => {
    const label = formatCrosshairTime(ms, '1d');
    expect(label).toMatch(/Thu 30 Jul '26/);
    expect(label).not.toMatch(/14:35/);
  });

  it('returns empty for zero timestamp', () => {
    expect(formatCrosshairTime(0, '1d')).toBe('');
  });
});
