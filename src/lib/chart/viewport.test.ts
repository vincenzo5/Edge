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
  SCROLL_BUFFER_CANDLES,
  DEFAULT_VISIBLE_BARS,
  DEFAULT_RIGHT_MARGIN_BARS,
  getDefaultViewport,
  defaultRightMarginBars,
  isViewportModified,
  isTimeWindowModified,
  adjustViewportForPrepend,
} from './viewport';
import type { Candle } from './contracts';
import { plotWidth } from './layout';

const sample: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11 },
  { t: 2, o: 11, h: 13, l: 10, c: 12 },
  { t: 3, o: 12, h: 14, l: 11, c: 13 },
];

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
  it('shifts the visible window within scroll buffer bounds', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const panned = pan(vp, 100, sample.length); // positive delta = older candles (left)
    expect(panned.startIndex).toBeGreaterThanOrEqual(-SCROLL_BUFFER_CANDLES);
    expect(panned.endIndex).toBeLessThanOrEqual(sample.length + SCROLL_BUFFER_CANDLES);
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

  it('allows panning into left virtual margin before first candle', () => {
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
    const panned = pan(vp, 200, candles.length);
    expect(panned.startIndex).toBeLessThan(0);
    expect(panned.startIndex).toBeGreaterThanOrEqual(-SCROLL_BUFFER_CANDLES);
  });

  it('allows panning into right virtual margin past last candle', () => {
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
    const panned = pan(vp, -200, candles.length);
    expect(panned.endIndex).toBeGreaterThan(candles.length);
    expect(panned.endIndex).toBeLessThanOrEqual(candles.length + SCROLL_BUFFER_CANDLES);
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
    expect(refreshed.endIndex).toBeLessThanOrEqual(short.length + SCROLL_BUFFER_CANDLES);
    expect(refreshed.startIndex).toBeGreaterThanOrEqual(-SCROLL_BUFFER_CANDLES);
    expect(refreshed.priceMax).toBeGreaterThan(refreshed.priceMin);
  });
});

describe('indexAtX', () => {
  it('maps x using candle count scroll buffer when endIndex exceeds data', () => {
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

    const wrong = indexAtX(480, vp, vp.endIndex);
    const right = indexAtX(480, vp, candles.length);
    expect(right).toBe(candles.length + SCROLL_BUFFER_CANDLES - 1);
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
    const bound = attachViewportHelpers(vp, candles.length);
    expect(bound.indexForX(799)).toBeLessThanOrEqual(candles.length + SCROLL_BUFFER_CANDLES - 1);
  });
});

describe('getDefaultViewport', () => {
  it('shows last DEFAULT_VISIBLE_BARS candles with right margin past the last bar', () => {
    const candles = Array.from({ length: 300 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const width = 800;
    const height = 400;
    const margin = defaultRightMarginBars(width, DEFAULT_VISIBLE_BARS);
    const vp = getDefaultViewport(candles, width, height);
    expect(vp.endIndex).toBe(300 + margin);
    expect(vp.startIndex).toBe(300 - DEFAULT_VISIBLE_BARS);
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
