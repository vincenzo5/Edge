import { describe, it, expect, beforeEach } from 'vitest';
import { createViewport, attachViewportHelpers } from './viewport';
import { TIME_AXIS_HEIGHT } from './layout';
import {
  formatCrosshairValue,
  priceForPlotY,
  shouldClearCrosshairOnLeave,
  findDataIndexForTimestamp,
  clampIndexToViewport,
} from './crosshair';
import { registerIndicator } from './indicators/registry';
import { clearComputeCache } from './indicatorCompute';
import type { Candle } from './contracts';
import type { IndicatorPlugin } from './plugin-api';

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

  it('matches viewport priceForY when reserveTimeAxis is set', () => {
    const vp = attachViewportHelpers(
      { ...createViewport(sample, 800, 400, 3), reserveTimeAxis: true },
      sample.length
    );
    const plotY = 100;
    expect(priceForPlotY(plotY, vp, true)).toBeCloseTo(vp.priceForY(plotY), 5);
  });
});

describe('formatCrosshairValue', () => {
  beforeEach(() => {
    clearComputeCache();
  });

  it('formats price pane values using plot-area coordinates', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const label = formatCrosshairValue('price', 0, vp, sample, 1, [], true);
    expect(label).toBe(vp.priceMax.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
  });

  it('uses explicit valueAt for MACD sub-pane', () => {
    const vp = createViewport(sample, 800, 400, 3);
    const label = formatCrosshairValue(
      'MACD::sub',
      100,
      vp,
      sample,
      2,
      [{ id: 'macd-1', name: 'MACD', pane: 'sub' }],
      true,
    );
    expect(label).not.toBe('');
  });

  it('falls back to first output when valueAt is not defined', () => {
    const plugin: IndicatorPlugin = {
      name: 'CrosshairDefaultTest',
      category: 'Momentum',
      description: 'Crosshair default test',
      pane: 'sub',
      compute: () => ({ primary: [1.5, 2.5, 3.5] }),
      outputs: [{ id: 'primary', label: 'Primary', key: 'primary', decimals: 2 }],
      draw: () => {},
    };
    registerIndicator(plugin);

    const vp = createViewport(sample, 800, 400, 3);
    const label = formatCrosshairValue(
      'CrosshairDefaultTest::sub',
      100,
      vp,
      sample,
      1,
      [{ id: 'crosshair-1', name: 'CrosshairDefaultTest', pane: 'sub' }],
      true,
    );
    expect(label).toBe('2.5');
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
