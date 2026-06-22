import { describe, it, expect } from 'vitest';
import type { Candle } from './contracts';
import {
  findIndexAtOrAfter,
  findIndexAtOrBefore,
  goToDate,
  goToRange,
  isRangeInLoadedData,
  isTimestampInLoadedRange,
} from './goTo';
import { attachViewportHelpers, createViewport } from './viewport';
import { plotWidth } from './layout';

const DAY = 86_400_000;

function makeCandles(count: number, start = new Date(2026, 0, 1)): Candle[] {
  const base = start.getTime();
  return Array.from({ length: count }, (_, i) => ({
    t: base + i * DAY,
    o: 100,
    h: 101,
    l: 99,
    c: 100,
    v: 1000,
  }));
}

describe('findIndexAtOrAfter', () => {
  const candles = makeCandles(10);

  it('returns first bar on exact match', () => {
    expect(findIndexAtOrAfter(candles, candles[3]!.t)).toBe(3);
  });

  it('returns next bar when between timestamps', () => {
    expect(findIndexAtOrAfter(candles, candles[3]!.t + DAY / 2)).toBe(4);
  });

  it('returns length when ms is after all bars', () => {
    expect(findIndexAtOrAfter(candles, candles[9]!.t + DAY)).toBe(10);
  });
});

describe('findIndexAtOrBefore', () => {
  const candles = makeCandles(10);

  it('returns last bar on exact match', () => {
    expect(findIndexAtOrBefore(candles, candles[3]!.t)).toBe(3);
  });

  it('returns prior bar when between timestamps', () => {
    expect(findIndexAtOrBefore(candles, candles[3]!.t + DAY / 2)).toBe(3);
  });

  it('returns -1 when ms is before all bars', () => {
    expect(findIndexAtOrBefore(candles, candles[0]!.t - 1)).toBe(-1);
  });
});

describe('isTimestampInLoadedRange', () => {
  const candles = makeCandles(10);

  it('returns true for in-range timestamps', () => {
    expect(isTimestampInLoadedRange(candles, candles[5]!.t)).toBe(true);
  });

  it('returns false when before first bar', () => {
    expect(isTimestampInLoadedRange(candles, candles[0]!.t - DAY)).toBe(false);
  });
});

describe('goToDate', () => {
  it('centers target bar preserving visible span', () => {
    const candles = makeCandles(100);
    const base = createViewport(candles, 800, 400, 50, 2);
    const vp = attachViewportHelpers(base, candles.length);
    const visibleBefore = vp.endIndex - vp.startIndex;

    const targetMs = candles[40]!.t;
    const next = goToDate(vp, candles, targetMs, 0.5);
    const visibleAfter = next.endIndex - next.startIndex;

    expect(visibleAfter).toBeCloseTo(visibleBefore, 0);
    const targetX = next.xForIndex(40);
    const plotMid = plotWidth(800) / 2;
    expect(targetX).toBeCloseTo(plotMid, 0);
  });

  it('clamps when target is near series start', () => {
    const candles = makeCandles(50);
    const base = createViewport(candles, 800, 400, 30, 2);
    const vp = attachViewportHelpers(base, candles.length);
    const next = goToDate(vp, candles, candles[0]!.t, 0.5);
    expect(next.startIndex).toBeGreaterThanOrEqual(-100);
    expect(next.endIndex - next.startIndex).toBeGreaterThanOrEqual(10);
  });
});

describe('goToRange', () => {
  it('fits viewport to the selected date window', () => {
    const candles = makeCandles(100);
    const base = createViewport(candles, 800, 400, 50, 2);
    const vp = attachViewportHelpers(base, candles.length);

    const next = goToRange(vp, candles, candles[20]!.t, candles[40]!.t);
    expect(next.startIndex).toBeLessThanOrEqual(20);
    expect(next.endIndex).toBeGreaterThan(40);
    expect(next.endIndex - next.startIndex).toBeLessThanOrEqual(25);
  });
});

describe('isRangeInLoadedData', () => {
  const candles = makeCandles(10);

  it('returns true when both ends are within loaded candles', () => {
    expect(isRangeInLoadedData(candles, candles[1]!.t, candles[8]!.t)).toBe(true);
  });

  it('returns false when start is before first bar', () => {
    expect(isRangeInLoadedData(candles, candles[0]!.t - DAY, candles[5]!.t)).toBe(false);
  });
});
