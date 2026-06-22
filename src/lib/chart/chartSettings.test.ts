import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHART_SETTINGS,
  mergeChartSettings,
  migrateChartSettings,
  patchChartSettings,
  serializeChartSettings,
} from './chartSettings';

describe('mergeChartSettings', () => {
  it('returns grouped defaults when partial is undefined', () => {
    expect(mergeChartSettings()).toEqual(DEFAULT_CHART_SETTINGS);
  });

  it('merges grouped partial overrides', () => {
    expect(mergeChartSettings({ canvas: { showGrid: false } }).canvas.showGrid).toBe(false);
    expect(mergeChartSettings({ canvas: { showGrid: false } }).statusLine.showChartValues).toBe(true);
  });

  it('includes scale and crosshair defaults', () => {
    expect(mergeChartSettings().scales.priceScaleType).toBe('linear');
    expect(mergeChartSettings().canvas.crosshairMode).toBe('cross');
    expect(mergeChartSettings().symbol.timeZone).toBe('UTC');
  });

  it('includes y-axis label defaults', () => {
    expect(mergeChartSettings().scales.symbolPriceLabelMode).toBe('valueLine');
    expect(mergeChartSettings().scales.indicatorPriceLabelMode).toBe('nameValue');
    expect(mergeChartSettings().scales.noOverlappingPriceLabels).toBe(true);
    expect(mergeChartSettings().scales.showCountdownToBarClose).toBe(true);
  });

  it('normalizes invalid timeZone on merge', () => {
    expect(mergeChartSettings({ symbol: { timeZone: 'Bad/Zone' } }).symbol.timeZone).toBe('UTC');
    expect(mergeChartSettings({ symbol: { timeZone: 'America/Chicago' } }).symbol.timeZone).toBe(
      'America/Chicago',
    );
  });

  it('migrates legacy flat settings', () => {
    const merged = mergeChartSettings({
      showGrid: false,
      showOHLC: false,
      priceScaleType: 'log',
      timeZone: 'America/New_York',
    });
    expect(merged.canvas.showGrid).toBe(false);
    expect(merged.statusLine.showChartValues).toBe(false);
    expect(merged.scales.priceScaleType).toBe('log');
    expect(merged.symbol.timeZone).toBe('America/New_York');
  });

  it('preserves unspecified sections when merging partial', () => {
    const merged = mergeChartSettings({ canvas: { showGrid: false } });
    expect(merged.scales.priceScaleType).toBe('linear');
    expect(merged.canvas.crosshairMode).toBe('cross');
    expect(merged.scales.symbolPriceLabelMode).toBe('valueLine');
  });
});

describe('patchChartSettings', () => {
  it('patches nested scale settings', () => {
    const patched = patchChartSettings(undefined, {
      scales: { invertPriceScale: true },
    });
    expect(mergeChartSettings(patched).scales.invertPriceScale).toBe(true);
  });

  it('supports legacy flat patches', () => {
    const patched = patchChartSettings(undefined, { showVolume: false });
    expect(mergeChartSettings(patched).statusLine.showVolume).toBe(false);
  });
});

describe('serializeChartSettings', () => {
  it('returns grouped shape without legacy keys', () => {
    const serialized = serializeChartSettings(DEFAULT_CHART_SETTINGS);
    expect(serialized.symbol?.timeZone).toBe('UTC');
    expect((serialized as { showGrid?: boolean }).showGrid).toBeUndefined();
  });
});

describe('migrateChartSettings', () => {
  it('returns empty object for undefined', () => {
    expect(migrateChartSettings()).toEqual({});
  });
});
