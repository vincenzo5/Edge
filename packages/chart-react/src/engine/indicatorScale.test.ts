import { describe, expect, it, beforeEach, vi } from 'vitest';
import { IndicatorRegistry } from '@edge/chart-core';
import { makeSyntheticCandles } from '@edge/chart-core';
import type { IndicatorConfig, VisibleRange } from '@edge/chart-core';
import { applyPanePriceScale, clearVisibleScaleCache } from './indicatorScale.js';
import { mergeChartSettings } from './chartSettings.js';
import { attachViewportHelpers } from './viewport.js';
import {
  IndicatorResultProvider,
  setDefaultIndicatorResultProvider,
} from './indicatorResultProvider.js';

const candles = makeSyntheticCandles(120);

function baseViewport(startIndex = 20, endIndex = 80): VisibleRange {
  return attachViewportHelpers(
    {
      startIndex,
      endIndex,
      priceMin: 90,
      priceMax: 110,
      barSpacing: 8,
      width: 800,
      height: 400,
      priceScaleMode: 'auto',
    },
    candles.length,
  );
}

function maOverlay(period = 20): IndicatorConfig {
  return {
    id: 'ma-overlay',
    name: 'MA',
    pane: 'main',
    inputs: { period },
  };
}

describe('applyPanePriceScale cache', () => {
  beforeEach(() => {
    clearVisibleScaleCache();
    setDefaultIndicatorResultProvider(new IndicatorResultProvider({ sessionKey: 'scale-test' }));
  });

  it('returns manual viewport unchanged without caching', () => {
    const vp = attachViewportHelpers(
      { ...baseViewport(), priceScaleMode: 'manual', priceMin: 50, priceMax: 150 },
      candles.length,
    );
    const next = applyPanePriceScale(vp, candles, 'price', [maOverlay()], mergeChartSettings());
    expect(next.priceMin).toBe(50);
    expect(next.priceMax).toBe(150);
  });

  it('reuses cached bounds for the same quantized window', () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'scale-test' });
    setDefaultIndicatorResultProvider(provider);
    const resolveSpy = vi.spyOn(provider, 'resolveSeries');
    const settings = mergeChartSettings();
    const indicators = [maOverlay()];

    const vp1 = baseViewport(20.2, 79.7);
    const first = applyPanePriceScale(vp1, candles, 'price', indicators, settings, null, provider);
    const resolveAfterFirst = resolveSpy.mock.calls.length;

    const vp2 = baseViewport(20.4, 79.9);
    const second = applyPanePriceScale(vp2, candles, 'price', indicators, settings, null, provider);

    expect(second.priceMin).toBe(first.priceMin);
    expect(second.priceMax).toBe(first.priceMax);
    expect(resolveSpy.mock.calls.length).toBe(resolveAfterFirst);
    resolveSpy.mockRestore();
  });

  it('recomputes when the quantized window changes', () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'scale-test' });
    const resolveSpy = vi.spyOn(provider, 'resolveSeries');
    const settings = mergeChartSettings();
    const indicators = [maOverlay()];

    applyPanePriceScale(baseViewport(10, 50), candles, 'price', indicators, settings, null, provider);
    const callsAfterFirst = resolveSpy.mock.calls.length;

    const next = applyPanePriceScale(baseViewport(60, 100), candles, 'price', indicators, settings, null, provider);

    expect(resolveSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    expect(next.priceMax).toBeGreaterThan(next.priceMin);
    resolveSpy.mockRestore();
  });

  it('recomputes when overlay indicator inputs change', () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'scale-test' });
    const resolveSpy = vi.spyOn(provider, 'resolveSeries');
    const settings = mergeChartSettings();

    applyPanePriceScale(baseViewport(), candles, 'price', [maOverlay(20)], settings, null, provider);
    const callsAfterFirst = resolveSpy.mock.calls.length;

    applyPanePriceScale(baseViewport(), candles, 'price', [maOverlay(50)], settings, null, provider);
    expect(resolveSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    resolveSpy.mockRestore();
  });

  it('auto-fits price pane with MA overlay', () => {
    const plugin = IndicatorRegistry.get('MA');
    expect(plugin).toBeTruthy();
    const scaled = applyPanePriceScale(
      baseViewport(0, candles.length - 1),
      candles,
      'price',
      [maOverlay()],
      mergeChartSettings(),
    );
    expect(scaled.priceMin).toBeLessThan(scaled.priceMax);
  });

  it('excludes the live quote when the latest candle is outside the visible window', () => {
    const livePrice = 1_000_000;
    const scaled = applyPanePriceScale(
      baseViewport(20, 80),
      candles,
      'price',
      [maOverlay()],
      mergeChartSettings(),
      livePrice,
    );

    expect(scaled.priceMax).toBeLessThan(livePrice);
  });

  it('includes the live quote when the latest candle is visible', () => {
    const livePrice = 1_000_000;
    const scaled = applyPanePriceScale(
      baseViewport(100, candles.length),
      candles,
      'price',
      [],
      mergeChartSettings(),
      livePrice,
    );

    expect(scaled.priceMax).toBe(livePrice);
  });
});
