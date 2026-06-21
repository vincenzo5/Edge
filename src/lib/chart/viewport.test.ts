import { describe, it, expect } from 'vitest';
import {
  createViewport,
  updatePriceRange,
  pan,
  zoom,
  scalePrice,
  scaleTime,
  panPrice,
  applyAutoPriceScale,
  resetPriceScale,
  SCROLL_BUFFER_CANDLES,
} from './viewport';
import type { Candle } from './contracts';

const sample: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11 },
  { t: 2, o: 11, h: 13, l: 10, c: 12 },
  { t: 3, o: 12, h: 14, l: 11, c: 13 },
];

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

  it('enters manual scale mode', () => {
    const candles = Array.from({ length: 200 }, (_, i) => ({
      t: i,
      o: 10,
      h: 12,
      l: 9,
      c: 11,
    }));
    const vp = createViewport(candles, 800, 400, 100);
    const scaled = scaleTime(vp, -50, candles.length);
    expect(scaled.scaleMode).toBe('manual');
  });
});

describe('panPrice', () => {
  it('translates price bounds without changing range width', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const rangeBefore = vp.priceMax - vp.priceMin;
    const panned = panPrice(vp, 40);
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
    vp = scalePrice(vp, 30);
    const beforeMin = vp.priceMin;
    const fitted = applyAutoPriceScale(vp, sample);
    expect(fitted.priceMin).toBe(beforeMin);
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
    const scaled = scalePrice(vp, 50);
    expect(scaled.priceMin).toBeLessThan(vp.priceMin);
    expect(scaled.priceMax).toBeGreaterThan(vp.priceMax);
    const newMid = (scaled.priceMin + scaled.priceMax) / 2;
    expect(newMid).toBeCloseTo(mid, 5);
    expect(scaled.scaleMode).toBe('manual');
  });
});

describe('resetPriceScale', () => {
  it('restores auto-fit plus padding and sets auto mode', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const manual = scalePrice(vp, 100);
    const reset = resetPriceScale(manual, sample);
    expect(reset.scaleMode).toBe('auto');
    expect(reset.priceMin).toBeLessThan(10);
    expect(reset.priceMax).toBeGreaterThan(14);
  });
});

describe('manual mode', () => {
  it('prevents auto price recompute on pan', () => {
    let vp = createViewport(sample, 800, 400, 3);
    vp = scalePrice(vp, 20);
    const beforeMin = vp.priceMin;
    const panned = pan(vp, 50, sample.length);
    expect(panned.priceMin).toBe(beforeMin);
  });
});

describe('time interactions preserve price scale', () => {
  it('pan and zoom leave priceMin/priceMax unchanged regardless of scaleMode', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const panned = pan(vp, 30, sample.length);
    expect(panned.priceMin).toBe(vp.priceMin);
    expect(panned.priceMax).toBe(vp.priceMax);

    const zoomed = zoom(vp, 1.2, 400, sample.length);
    expect(zoomed.priceMin).toBe(vp.priceMin);
    expect(zoomed.priceMax).toBe(vp.priceMax);
  });

  it('updatePriceRange is the only mutator of price bounds when scaleMode=auto', () => {
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
