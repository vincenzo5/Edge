import { describe, it, expect } from 'vitest';
import { createViewport } from './viewport';
import { TIME_AXIS_HEIGHT } from './layout';
import {
  formatCrosshairValue,
  priceForPlotY,
  shouldClearCrosshairOnLeave,
  findDataIndexForTimestamp,
  clampIndexToViewport,
} from './crosshair';
import type { Candle } from './contracts';

const sample: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 11 },
  { t: 2, o: 11, h: 13, l: 10, c: 12 },
  { t: 3, o: 12, h: 14, l: 11, c: 13 },
];

describe('priceForPlotY', () => {
  it('maps top of plot area to priceMax', () => {
    const vp = createViewport(sample, 800, 400, 3);
    expect(priceForPlotY(0, vp, true)).toBeCloseTo(vp.priceMax, 5);
  });

  it('maps bottom of plot area to priceMin when time axis is reserved', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const ph = 400 - TIME_AXIS_HEIGHT;
    expect(priceForPlotY(ph, vp, true)).toBeCloseTo(vp.priceMin, 5);
  });

  it('differs from full-canvas priceForY when time axis is reserved', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const plotY = 100;
    expect(priceForPlotY(plotY, vp, true)).not.toBeCloseTo(vp.priceForY(plotY), 5);
  });
});

describe('formatCrosshairValue', () => {
  it('formats price pane values using plot-area coordinates', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const label = formatCrosshairValue('price', 0, vp, sample, 1, [], true);
    expect(label).toBe(vp.priceMax.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
  });
});

describe('shouldClearCrosshairOnLeave', () => {
  it('clears when leaving the chart container entirely', () => {
    const container = document.createElement('div');
    const outside = document.createElement('span');
    document.body.append(container, outside);
    expect(shouldClearCrosshairOnLeave(outside, container)).toBe(true);
    container.remove();
    outside.remove();
  });

  it('does not clear when moving to another pane inside the chart', () => {
    const container = document.createElement('div');
    const pane = document.createElement('canvas');
    container.append(pane);
    document.body.append(container);
    expect(shouldClearCrosshairOnLeave(pane, container)).toBe(false);
    container.remove();
  });

  it('clears when container is missing', () => {
    expect(shouldClearCrosshairOnLeave(null, null)).toBe(true);
  });
});

describe('findDataIndexForTimestamp', () => {
  it('finds exact timestamp match', () => {
    expect(findDataIndexForTimestamp(sample, 2)).toBe(1);
  });

  it('returns nearest index for between-bar timestamps', () => {
    expect(findDataIndexForTimestamp(sample, 2.4)).toBe(1);
  });

  it('returns -1 for empty series', () => {
    expect(findDataIndexForTimestamp([], 1)).toBe(-1);
  });
});

describe('clampIndexToViewport', () => {
  it('clamps to visible window', () => {
    const vp = createViewport(sample, 800, 400, 3);
    expect(clampIndexToViewport(-5, vp)).toBe(vp.startIndex);
    expect(clampIndexToViewport(999, vp)).toBe(vp.endIndex);
  });
});
