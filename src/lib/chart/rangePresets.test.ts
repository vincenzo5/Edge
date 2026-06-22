import { describe, it, expect } from 'vitest';
import type { Candle } from './contracts';
import {
  BOTTOM_RANGE_PRESETS,
  findStartIndexForCutoff,
  getRangeViewport,
  getFetchedWindowViewport,
  getSessionViewport,
  rangeCutoffMs,
  rangePresetLabel,
} from './rangePresets';
import { getDefaultViewport } from './viewport';

const MS_DAY = 86_400_000;

function makeCandles(count: number, start = new Date(2026, 0, 1)): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    t: start.getTime() + i * MS_DAY,
    o: 10,
    h: 11,
    l: 9,
    c: 10,
  }));
}

describe('BOTTOM_RANGE_PRESETS', () => {
  it('matches TradingView bottom bar set', () => {
    expect(BOTTOM_RANGE_PRESETS).toEqual([
      '1d',
      '5d',
      '1mo',
      '3mo',
      '6mo',
      'ytd',
      '1y',
      '5y',
      'max',
    ]);
  });
});

describe('rangeCutoffMs', () => {
  const ref = new Date(2026, 5, 15, 12, 0, 0);

  it('returns start of year for ytd', () => {
    expect(rangeCutoffMs('ytd', ref)).toBe(new Date(2026, 0, 1).getTime());
  });

  it('returns zero for max', () => {
    expect(rangeCutoffMs('max', ref)).toBe(0);
  });

  it('subtracts days for fixed ranges', () => {
    const cutoff = rangeCutoffMs('1mo', ref);
    expect(ref.getTime() - cutoff).toBeCloseTo(30 * MS_DAY, -3);
  });
});

describe('findStartIndexForCutoff', () => {
  it('finds first candle at or after cutoff', () => {
    const candles = makeCandles(100);
    const cutoff = candles[80]!.t;
    expect(findStartIndexForCutoff(candles, cutoff)).toBe(80);
  });

  it('returns zero when cutoff is zero', () => {
    const candles = makeCandles(10);
    expect(findStartIndexForCutoff(candles, 0)).toBe(0);
  });
});

describe('getRangeViewport', () => {
  it('anchors the right edge to the latest candle', () => {
    const ref = new Date(2026, 5, 15);
    const candles = makeCandles(200, new Date(2026, 0, 1));
    const vp = getRangeViewport(candles, '1mo', 800, 400, ref);
    expect(vp.endIndex).toBeGreaterThanOrEqual(candles.length);
    expect(vp.startIndex).toBeGreaterThan(0);
  });

  it('shows all candles for max', () => {
    const candles = makeCandles(50);
    const vp = getRangeViewport(candles, 'max', 800, 400);
    expect(vp.startIndex).toBe(0);
  });

  it('falls back to full history when cutoff is after all bars', () => {
    const ref = new Date(2026, 5, 15);
    const candles = makeCandles(20, new Date(2020, 0, 1));
    const vp = getRangeViewport(candles, '1mo', 800, 400, ref);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBeGreaterThanOrEqual(candles.length);
  });
});

describe('getSessionViewport', () => {
  it('uses range cutoff for active presets', () => {
    const ref = new Date(2026, 5, 15);
    const candles = makeCandles(200, new Date(2026, 0, 1));
    const vp = getSessionViewport(candles, 800, 400, '1mo');
    expect(vp.startIndex).toBeGreaterThan(0);
  });

  it('uses live-edge window when no preset is active', () => {
    const candles = makeCandles(200);
    const vp = getSessionViewport(candles, 800, 400, null);
    expect(vp.startIndex).toBeGreaterThan(0);
    expect(vp.endIndex).toBeGreaterThan(candles.length);
  });

  it('aligns latest candle x-position with the default landing view', () => {
    const width = 800;
    const height = 400;
    const ref = new Date(2026, 5, 15);
    const candles = makeCandles(200, new Date(2026, 0, 1));
    const lastIdx = candles.length - 1;
    const targetX = getDefaultViewport(candles, width, height).xForIndex(lastIdx);

    for (const preset of ['1mo', '1y', 'max'] as const) {
      const vp = getSessionViewport(candles, width, height, preset);
      expect(Math.abs(vp.xForIndex(lastIdx) - targetX)).toBeLessThanOrEqual(1);
    }
  });
});

describe('getFetchedWindowViewport', () => {
  it('shows all candles from start to end margin', () => {
    const candles = makeCandles(50);
    const vp = getFetchedWindowViewport(candles, 800, 400);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBeGreaterThan(candles.length);
  });

  it('keeps the latest candle clear of the price axis strip', () => {
    const candles = makeCandles(390);
    const width = 800;
    const vp = getFetchedWindowViewport(candles, width, 400);
    const lastIdx = candles.length - 1;
    const x = vp.xForIndex(lastIdx);
    const visible = vp.endIndex - vp.startIndex;
    const halfW = ((width - 50) / visible) * 0.7 / 2;
    expect(x + halfW).toBeLessThanOrEqual(width - 50);
  });
});

describe('rangePresetLabel', () => {
  it('maps max to All', () => {
    expect(rangePresetLabel('max')).toBe('All');
  });

  it('maps month presets to uppercase M suffix', () => {
    expect(rangePresetLabel('1mo')).toBe('1M');
    expect(rangePresetLabel('3mo')).toBe('3M');
  });
});
