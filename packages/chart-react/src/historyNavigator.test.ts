import { describe, expect, it } from 'vitest';
import type { VisibleRange } from '@edge/chart-core';
import {
  computeHistoryNavigatorGeometry,
  HISTORY_NAVIGATOR_MIN_THUMB_PCT,
} from './historyNavigator';

function makeVp(startIndex: number, endIndex: number, width = 800): VisibleRange {
  const visible = endIndex - startIndex;
  const pw = width - 60;
  return {
    startIndex,
    endIndex,
    priceMin: 0,
    priceMax: 100,
    width,
    height: 400,
    xForIndex: (i: number) => ((i - startIndex) / visible) * pw,
    yForPrice: () => 0,
    indexForX: (x: number) => startIndex + (x / pw) * visible,
    priceForY: () => 0,
  } as VisibleRange;
}

describe('computeHistoryNavigatorGeometry', () => {
  const candles = Array.from({ length: 100 }, (_, i) => ({
    t: 1_000_000 + i * 86_400_000,
  }));

  const extent = {
    fromMs: candles[0]!.t,
    toMs: candles.at(-1)!.t,
    completeness: 'exact' as const,
  };

  it('returns plot-aligned thumb geometry for a mid-history window', () => {
    const geometry = computeHistoryNavigatorGeometry(
      extent,
      candles,
      makeVp(20, 50),
      800,
      'right',
    );
    expect(geometry).not.toBeNull();
    expect(geometry!.trackWidthPct).toBeGreaterThan(0);
    expect(geometry!.trackWidthPct).toBeLessThan(100);
    expect(geometry!.thumbWidthPct).toBeGreaterThanOrEqual(
      (HISTORY_NAVIGATOR_MIN_THUMB_PCT / 100) * geometry!.trackWidthPct * 0.5,
    );
    expect(geometry!.indeterminateLeft).toBe(false);
  });

  it('flags discovered extents as indeterminate on the left edge', () => {
    const geometry = computeHistoryNavigatorGeometry(
      { ...extent, completeness: 'discovered' },
      candles,
      makeVp(0, 30),
      800,
    );
    expect(geometry?.indeterminateLeft).toBe(true);
  });

  it('returns null without extent or candles', () => {
    expect(computeHistoryNavigatorGeometry(null, [], makeVp(0, 10), 800)).toBeNull();
  });
});
