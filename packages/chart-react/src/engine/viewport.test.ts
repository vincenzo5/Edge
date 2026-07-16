import { describe, it, expect } from 'vitest';
import {
  createViewport,
  updatePriceRange,
  pan,
  zoom,
  scalePrice,
  scaleTime,
  scalePriceFromInitial,
  scaleTimeFromInitial,
  panPrice,
  applyAutoPriceScale,
  resetPriceScale,
  refreshViewportForDataChange,
  indexAtX,
  attachViewportHelpers,
  withPriceScaleContext,
  ensureRightMarginBars,
  scrollSlackBars,
  DEFAULT_VISIBLE_BARS,
  DEFAULT_RIGHT_MARGIN_BARS,
  getDefaultViewport,
  getLiveEdgeViewport,
  defaultRightMarginBars,
  liveEdgeMarginBars,
  liveEdgeEndIndex,
  defaultLiveEdgeCandleX,
  isViewportModified,
  isTimeWindowModified,
  adjustViewportForPrepend,
} from './viewport';
import type { Candle } from '@edge/chart-core/contracts';
import { plotWidth } from '@edge/chart-core/layout';

const sample: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11 },
  { t: 2, o: 11, h: 13, l: 10, c: 12 },
  { t: 3, o: 12, h: 14, l: 11, c: 13 },
];

function slackFor(vp: { startIndex: number; endIndex: number }) {
  return scrollSlackBars(vp.endIndex - vp.startIndex);
}

describe('adjustViewportForPrepend', () => {
  it('shifts startIndex and endIndex by addedCount', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const shifted = adjustViewportForPrepend(vp, 50);
    expect(shifted.startIndex).toBe(vp.startIndex + 50);
    expect(shifted.endIndex).toBe(vp.endIndex + 50);
    expect(shifted.priceMin).toBe(vp.priceMin);
    expect(shifted.priceMax).toBe(vp.priceMax);
  });

  it('returns same viewport when addedCount is zero or negative', () => {
    const vp = createViewport(sample, 800, 400, 3);
    expect(adjustViewportForPrepend(vp, 0)).toBe(vp);
    expect(adjustViewportForPrepend(vp, -5)).toBe(vp);
  });
});

describe('createViewport', () => {
  it('creates a viewport with correct initial range and price bounds', () => {
    const vp = createViewport(sample, 800, 400, 2);
    expect(vp.startIndex).toBe(1);
    expect(vp.endIndex).toBe(3);
    // price range should include 5% padding around the visible lows/highs
    expect(vp.priceMin).toBeLessThan(10);
    expect(vp.priceMax).toBeGreaterThan(14);
  });

  it('handles empty candles with safe [0,1] range', () => {
    const vp = createViewport([], 800, 400);
    expect(vp.priceMin).toBe(0);
    expect(vp.priceMax).toBe(1);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBe(0);
  });
});

describe('computePriceRange (via create/update)', () => {
  it('produces safe range for degenerate data (all same price)', () => {
    const flat: Candle[] = Array.from({ length: 5 }, (_, i) => ({ t: i, o: 5, h: 5, l: 5, c: 5 }));
    const vp = createViewport(flat, 800, 400);
    expect(vp.priceMin).toBe(0);
    expect(vp.priceMax).toBe(1);
  });
});

describe('pan', () => {
  it('shifts the visible window within visible-sized scroll bounds', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const panned = pan(vp, 100, sample.length); // positive delta = older candles (left)
    const slack = slackFor(panned);
    expect(panned.startIndex).toBeGreaterThanOrEqual(-slack);
    expect(panned.endIndex).toBeLessThanOrEqual(sample.length + slack);
  });

  it('preserves visible candle count for interior pans', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10 + i * 0.1,
      h: 12 + i * 0.1,
      l: 9 + i * 0.1,
      c: 11 + i * 0.1,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const before = vp.endIndex - vp.startIndex;
    const panned = pan(vp, 50, candles.length);
    expect(panned.endIndex - panned.startIndex).toBe(before);
  });

  it('preserves visible candle count at left buffer edge', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    vp.startIndex = 0;
    vp.endIndex = 100;
    const before = vp.endIndex - vp.startIndex;
    const panned = pan(vp, 100, candles.length);
    expect(panned.endIndex - panned.startIndex).toBe(before);
  });

  it('allows panning until the first candle is at the right edge', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 50);
    vp.startIndex = 0;
    vp.endIndex = 50;
    const visible = vp.endIndex - vp.startIndex;
    // Large positive delta pushes into past empty space
    const panned = pan(vp, 10_000, candles.length);
    expect(panned.startIndex).toBe(-(visible - 1));
    expect(panned.endIndex).toBe(1);
    // First candle (index 0) is the rightmost visible bar
    const pw = plotWidth(800);
    expect(panned.xForIndex(0)).toBeCloseTo(((0 - panned.startIndex) / visible) * pw, 5);
    expect(panned.xForIndex(0)).toBeGreaterThan(pw * 0.9);
  });

  it('allows panning until the last candle is at the left edge', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 50);
    vp.startIndex = 150;
    vp.endIndex = 200;
    const visible = vp.endIndex - vp.startIndex;
    // Large negative delta pushes into future empty space
    const panned = pan(vp, -10_000, candles.length);
    expect(panned.startIndex).toBe(candles.length - 1);
    expect(panned.endIndex).toBe(candles.length - 1 + visible);
    // Last candle sits at the left edge of the plot
    expect(panned.xForIndex(candles.length - 1)).toBeCloseTo(0, 5);
  });
});

describe('zoom', () => {
  it('zooms in around anchor while respecting MIN_CANDLES', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const zoomed = zoom(vp, 1.5, 400, sample.length);
    const visible = zoomed.endIndex - zoomed.startIndex;
    expect(visible).toBeGreaterThanOrEqual(2); // MIN_CANDLES safety
  });

  it('preserves auto price scale mode', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const zoomed = zoom(vp, 1.2, 400, sample.length);
    expect(zoomed.priceScaleMode).toBe('auto');
  });

  it('allows auto refit after zoom when visible window changes', () => {
    const candles = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      o: 10 + i,
      h: 12 + i,
      l: 9 + i,
      c: 11 + i,
    }));
    const vp = createViewport(candles, 800, 400, 50);
    const zoomed = zoom(vp, 1.5, 400, candles.length);
    const fitted = applyAutoPriceScale(zoomed, candles);
    expect(fitted.priceScaleMode).toBe('auto');
    expect(fitted.priceMin).not.toBe(vp.priceMin);
  });
});

describe('scaleTime', () => {
  it('changes visible candle count on horizontal drag', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const before = vp.endIndex - vp.startIndex;
    const scaled = scaleTime(vp, -50, candles.length);
    expect(scaled.endIndex - scaled.startIndex).not.toBe(before);
  });

  it('leaves price bounds unchanged', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const scaled = scaleTime(vp, -50, candles.length);
    expect(scaled.priceMin).toBe(vp.priceMin);
    expect(scaled.priceMax).toBe(vp.priceMax);
  });

  it('switches to manual price scale mode', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const scaled = scaleTime(vp, -50, candles.length);
    expect(scaled.priceScaleMode).toBe('manual');
    const fitted = applyAutoPriceScale(scaled, candles);
    expect(fitted.priceMin).toBe(scaled.priceMin);
    expect(fitted.priceMax).toBe(scaled.priceMax);
  });

  it('keeps window center near plot center when scaling time', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const mid = (vp.startIndex + vp.endIndex) / 2;
    const scaled = scaleTime(vp, -80, candles.length);
    const scaledMid = (scaled.startIndex + scaled.endIndex) / 2;
    expect(Math.abs(scaledMid - mid)).toBeLessThanOrEqual(1);
  });

  it('scales time axis meaningfully for a moderate horizontal drag', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const before = vp.endIndex - vp.startIndex;
    const scaled = scaleTimeFromInitial(vp, 100, candles.length);
    const after = scaled.endIndex - scaled.startIndex;
    expect(after).toBeLessThan(before * 0.92);
  });
});

describe('panPrice', () => {
  it('translates price bounds without changing range width', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const rangeBefore = vp.priceMax - vp.priceMin;
    const panned = panPrice(vp, 40, sample.length);
    expect(panned.priceMax - panned.priceMin).toBeCloseTo(rangeBefore, 5);
    expect(panned.priceMin).not.toBe(vp.priceMin);
    expect(panned.priceMax).not.toBe(vp.priceMax);
  });
});

describe('applyAutoPriceScale', () => {
  it('recomputes price range in auto mode after time shift', () => {
    const candles = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      o: 10 + i,
      h: 12 + i,
      l: 9 + i,
      c: 11 + i,
    }));
    const vp = createViewport(candles, 800, 400, 20);
    const panned = pan(vp, 80, candles.length);
    const fitted = applyAutoPriceScale(panned, candles);
    expect(fitted.priceMin).not.toBe(panned.priceMin);
    expect(fitted.priceMax).not.toBe(panned.priceMax);
  });

  it('is a no-op in manual mode', () => {
    let vp = createViewport(sample, 800, 400, 3);
    vp = scalePrice(vp, 30, sample.length);
    const beforeMin = vp.priceMin;
    const fitted = applyAutoPriceScale(vp, sample);
    expect(fitted.priceMin).toBe(beforeMin);
  });

  it('locks auto price scale after time-axis scale drag; pan still refits in auto mode', () => {
    const candles = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      o: 10 + i,
      h: 12 + i,
      l: 9 + i,
      c: 11 + i,
    }));
    const vp = createViewport(candles, 800, 400, 20);
    const scaled = scaleTime(vp, -40, candles.length);
    expect(scaled.priceScaleMode).toBe('manual');
    const panned = pan(scaled, 60, candles.length);
    const fitted = applyAutoPriceScale(panned, candles);
    expect(fitted.priceMin).toBe(panned.priceMin);
    expect(fitted.priceMax).toBe(panned.priceMax);
  });
});

describe('updatePriceRange', () => {
  it('recomputes price bounds after data change', () => {
    const vp = createViewport(sample, 800, 400);
    const updated = updatePriceRange(vp, sample.slice(0, 1));
    expect(updated.priceMin).toBeLessThanOrEqual(9);
    expect(updated.priceMax).toBeGreaterThanOrEqual(12);
  });
});

describe('scalePrice', () => {
  it('vertical stretch preserves anchor and updates priceMin/Max', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const mid = (vp.priceMin + vp.priceMax) / 2;
    const scaled = scalePrice(vp, 50, sample.length);
    expect(scaled.priceMin).toBeLessThan(vp.priceMin);
    expect(scaled.priceMax).toBeGreaterThan(vp.priceMax);
    const newMid = (scaled.priceMin + scaled.priceMax) / 2;
    expect(newMid).toBeCloseTo(mid, 5);
    expect(scaled.priceScaleMode).toBe('manual');
  });
});

describe('resetPriceScale', () => {
  it('restores auto-fit plus padding and sets auto mode', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const manual = scalePrice(vp, 100, sample.length);
    const reset = resetPriceScale(manual, sample);
    expect(reset.priceScaleMode).toBe('auto');
    expect(reset.priceMin).toBeLessThan(10);
    expect(reset.priceMax).toBeGreaterThan(14);
  });
});

describe('manual mode', () => {
  it('prevents auto price recompute on pan', () => {
    let vp = createViewport(sample, 800, 400, 3);
    vp = scalePrice(vp, 20, sample.length);
    const beforeMin = vp.priceMin;
    const panned = pan(vp, 50, sample.length);
    expect(panned.priceMin).toBe(beforeMin);
  });
});

describe('time interactions preserve price scale', () => {
  it('pan and zoom leave priceMin/priceMax unchanged regardless of priceScaleMode', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const panned = pan(vp, 30, sample.length);
    expect(panned.priceMin).toBe(vp.priceMin);
    expect(panned.priceMax).toBe(vp.priceMax);

    const zoomed = zoom(vp, 1.2, 400, sample.length);
    expect(zoomed.priceMin).toBe(vp.priceMin);
    expect(zoomed.priceMax).toBe(vp.priceMax);
  });

  it('updatePriceRange is the only mutator of price bounds when priceScaleMode=auto', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const beforeMin = vp.priceMin;
    const beforeMax = vp.priceMax;

    // pan/zoom should not touch price
    const afterPan = pan(vp, 20, sample.length);
    expect(afterPan.priceMin).toBe(beforeMin);
    expect(afterPan.priceMax).toBe(beforeMax);

    const afterZoom = zoom(vp, 0.8, 400, sample.length);
    expect(afterZoom.priceMin).toBe(beforeMin);
    expect(afterZoom.priceMax).toBe(beforeMax);

    // updatePriceRange does change them
    const reduced = updatePriceRange(vp, sample.slice(0, 1));
    expect(reduced.priceMin).not.toBe(beforeMin);
    expect(reduced.priceMax).not.toBe(beforeMax);
  });
});

describe('refreshViewportForDataChange', () => {
  it('clamps stale indices and refits price when candle count shrinks', () => {
    const long = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10 + i * 0.5,
      h: 12 + i * 0.5,
      l: 9 + i * 0.5,
      c: 11 + i * 0.5,
    }));
    const vp = createViewport(long, 800, 400, 100);
    vp.endIndex = long.length + 80;
    vp.startIndex = long.length;

    const short = long.slice(0, 50);
    const refreshed = refreshViewportForDataChange(vp, short, 800, 400);
    const slack = slackFor(refreshed);
    expect(refreshed.endIndex).toBeLessThanOrEqual(short.length + slack);
    expect(refreshed.startIndex).toBeGreaterThanOrEqual(-slack);
    expect(refreshed.priceMax).toBeGreaterThan(refreshed.priceMin);
  });

  it('restores right margin at live edge when candle count shrinks to endIndex', () => {
    const width = 800;
    const long = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = attachViewportHelpers(
      {
        ...createViewport(long, width, 400, 150),
        startIndex: 150,
        endIndex: 300,
      },
      long.length,
    );

    const short = long.slice(0, 252);
    const refreshed = refreshViewportForDataChange(vp, short, width, 400);
    expect(refreshed.endIndex).toBeGreaterThan(short.length);
    const lastIdx = short.length - 1;
    const x = refreshed.xForIndex(lastIdx);
    const visible = refreshed.endIndex - refreshed.startIndex;
    const halfW = (plotWidth(width) / visible) * 0.7 / 2;
    expect(x + halfW).toBeLessThanOrEqual(plotWidth(width));
  });
});

describe('indexAtX', () => {
  it('maps x using candle count scroll slack when endIndex exceeds data', () => {
    const candles = Array.from({ length: 100 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 50);
    vp.endIndex = 250;
    vp.startIndex = 150;
    const slack = scrollSlackBars(vp.endIndex - vp.startIndex);

    const wrong = indexAtX(480, vp, vp.endIndex);
    const right = indexAtX(480, vp, candles.length);
    expect(right).toBe(candles.length + slack - 1);
    expect(wrong).toBeGreaterThan(right);
  });

  it('attachViewportHelpers uses candle count for indexForX', () => {
    const candles = Array.from({ length: 100 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 50);
    vp.endIndex = candles.length + 50;
    const slack = scrollSlackBars(vp.endIndex - vp.startIndex);
    const bound = attachViewportHelpers(vp, candles.length);
    expect(bound.indexForX(799)).toBeLessThanOrEqual(candles.length + slack - 1);
  });
});

describe('getLiveEdgeViewport', () => {
  it('shows last DEFAULT_VISIBLE_BARS with right margin by default', () => {
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const width = 800;
    const height = 400;
    const margin = liveEdgeMarginBars(width, DEFAULT_VISIBLE_BARS);
    const vp = getLiveEdgeViewport(candles, width, height);
    expect(vp.endIndex).toBeGreaterThanOrEqual(300 + margin);
    expect(vp.startIndex).toBeGreaterThanOrEqual(300 - DEFAULT_VISIBLE_BARS);
  });

  it('aligns latest candle x-position across visible data bar counts', () => {
    const width = 800;
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const lastIdx = candles.length - 1;
    const targetX = getDefaultViewport(candles, width, 400).xForIndex(lastIdx);

    for (const dataBars of [30, 90, 150, 252]) {
      const vp = getLiveEdgeViewport(candles, width, 400, dataBars);
      expect(Math.abs(vp.xForIndex(lastIdx) - targetX)).toBeLessThanOrEqual(1);
    }
  });

  it('shows all candles when maxDataBars equals series length', () => {
    const candles = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = getLiveEdgeViewport(candles, 800, 400, 50);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBeGreaterThan(candles.length);
  });

  it('keeps the latest candle clear of the price axis strip', () => {
    const candles = Array.from({ length: 390 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const width = 800;
    const vp = getLiveEdgeViewport(candles, width, 400, candles.length);
    const lastIdx = candles.length - 1;
    const x = vp.xForIndex(lastIdx);
    const visible = vp.endIndex - vp.startIndex;
    const halfW = (plotWidth(width) / visible) * 0.7 / 2;
    expect(x + halfW).toBeLessThanOrEqual(plotWidth(width));
  });
});

describe('getDefaultViewport', () => {
  it('shows all fetched candles with right margin past the last bar', () => {
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const width = 800;
    const height = 400;
    const vp = getDefaultViewport(candles, width, height);
    expect(vp.startIndex).toBe(0);
    expect(vp.endIndex).toBeGreaterThanOrEqual(300);
    expect(vp.priceScaleMode).toBe('auto');
  });

  it('keeps the latest candle clear of the price axis strip', () => {
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const width = 800;
    const height = 400;
    const vp = getDefaultViewport(candles, width, height);
    const lastIdx = candles.length - 1;
    const x = vp.xForIndex(lastIdx);
    const visible = vp.endIndex - vp.startIndex;
    const halfW = (plotWidth(width) / visible) * 0.7 / 2;
    expect(x + halfW).toBeLessThanOrEqual(plotWidth(width));
  });
});

describe('isViewportModified', () => {
  const candles = Array.from({ length: 200 }, (_, i) => ({
    t: i,
    o: 10 + i * 0.1,
    h: 12 + i * 0.1,
    l: 9 + i * 0.1,
    c: 11 + i * 0.1,
  }));

  it('returns false for the default viewport', () => {
    const vp = getDefaultViewport(candles, 800, 400);
    expect(isViewportModified(vp, candles, 800, 400)).toBe(false);
  });

  it('returns true after horizontal pan', () => {
    const vp = getDefaultViewport(candles, 800, 400);
    const panned = pan(vp, 80, candles.length);
    expect(isTimeWindowModified(panned, candles, 800, 400)).toBe(true);
    expect(isViewportModified(panned, candles, 800, 400)).toBe(true);
  });

  it('returns true after zoom', () => {
    const vp = getDefaultViewport(candles, 800, 400);
    const zoomed = zoom(vp, 1.5, 400, candles.length);
    expect(isViewportModified(zoomed, candles, 800, 400)).toBe(true);
  });

  it('returns true after manual price scale', () => {
    const vp = getDefaultViewport(candles, 800, 400);
    const scaled = scalePrice(vp, 50, candles.length);
    expect(isViewportModified(scaled, candles, 800, 400)).toBe(true);
  });

  it('returns false after reset via getDefaultViewport', () => {
    let vp = getDefaultViewport(candles, 800, 400);
    vp = pan(vp, 100, candles.length);
    vp = zoom(vp, 1.3, 400, candles.length);
    const reset = getDefaultViewport(candles, 800, 400);
    expect(isViewportModified(reset, candles, 800, 400)).toBe(false);
  });
});

describe('price scale context', () => {
  const candles: Candle[] = [
    { t: 1, o: 100, h: 105, l: 98, c: 102 },
    { t: 2, o: 102, h: 110, l: 101, c: 108 },
    { t: 3, o: 108, h: 112, l: 106, c: 110 },
  ];

  it('log scale maps higher raw price to lower Y', () => {
    let vp = createViewport(candles, 800, 400, 3);
    vp = attachViewportHelpers(
      withPriceScaleContext(vp, candles, { priceScaleType: 'log' }),
      candles.length,
    );
    vp = updatePriceRange(vp, candles);
    const yLow = vp.yForPrice(100);
    const yHigh = vp.yForPrice(110);
    expect(yHigh).toBeLessThan(yLow);
  });

  it('recomputes percent anchor after pan', () => {
    let vp = createViewport(candles, 800, 400, 3);
    vp = attachViewportHelpers(
      withPriceScaleContext(vp, candles, { priceScaleType: 'percent' }),
      candles.length,
    );
    vp = updatePriceRange(vp, candles);
    expect(vp.priceScaleContext?.anchorPrice).toBe(102);

    const panned = pan(vp, -400, candles.length);
    const refit = updatePriceRange(
      attachViewportHelpers(
        withPriceScaleContext(panned, candles, { priceScaleType: 'percent' }),
        candles.length,
      ),
      candles,
    );
    const ds = Math.max(0, Math.floor(refit.startIndex));
    expect(refit.priceScaleContext?.anchorPrice).toBe(candles[ds]?.c);
  });

  it('yForPrice and priceForY round-trip for log scale', () => {
    let vp = createViewport(candles, 800, 400, 3);
    vp = attachViewportHelpers(
      withPriceScaleContext(vp, candles, { priceScaleType: 'log' }),
      candles.length,
    );
    vp = updatePriceRange(vp, candles);
    const price = 105;
    const y = vp.yForPrice(price);
    expect(vp.priceForY(y)).toBeCloseTo(price, 2);
  });
});

describe('ensureRightMarginBars', () => {
  const candles: Candle[] = Array.from({ length: 100 }, (_, i) => ({
    t: i,
    o: 10,
    h: 12,
    l: 9,
    c: 11,
  }));

  it('extends endIndex at live edge while preserving visible count', () => {
    const width = 800;
    const n = candles.length;
    const visible = 50;
    const vp = {
      startIndex: n - visible,
      endIndex: n,
      priceMin: 0,
      priceMax: 20,
      width,
      height: 400,
    };
    const targetEnd = liveEdgeEndIndex(vp.startIndex, n, width);
    const next = ensureRightMarginBars(vp, n, width);
    expect(next.endIndex).toBeCloseTo(targetEnd, 5);
    expect(next.startIndex).toBe(vp.startIndex);
  });

  it('no-ops when margin already satisfied', () => {
    const width = 800;
    const n = candles.length;
    const startIndex = n - 50;
    const endIndex = liveEdgeEndIndex(startIndex, n, width);
    const vp = {
      startIndex: n - 50,
      endIndex,
      priceMin: 0,
      priceMax: 20,
      width,
      height: 400,
    };
    const next = ensureRightMarginBars(vp, n, width);
    expect(next.endIndex).toBe(vp.endIndex);
  });
});

describe('adjustViewportForPrepend', () => {
  it('shifts start and end indices by the number of prepended bars', () => {
    const existing: Candle[] = Array.from({ length: 100 }, (_, i) => ({
      t: 1000 + i * 1000,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = attachViewportHelpers(getDefaultViewport(existing, 800, 400), existing.length);
    const shifted = adjustViewportForPrepend(vp, 20);
    expect(shifted.startIndex).toBe(vp.startIndex + 20);
    expect(shifted.endIndex).toBe(vp.endIndex + 20);
  });
});

describe('defaultLiveEdgeCandleX', () => {
  it('matches getDefaultViewport latest candle position', () => {
    const width = 800;
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = getDefaultViewport(candles, width, 400);
    const lastIdx = candles.length - 1;
    expect(vp.xForIndex(lastIdx)).toBeCloseTo(defaultLiveEdgeCandleX(width), 5);
  });
});
