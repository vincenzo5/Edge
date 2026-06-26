import { describe, expect, it } from 'vitest';
import {
  RenderScheduler,
  BACKGROUND_INVALIDATING,
  canReuseBackgroundCache,
  canReuseLayerCache,
  isCheapInteraction,
} from './renderScheduler';
import { STANDARD_CHART_LAYERS } from './layers';

describe('RenderScheduler', () => {
  it('coalesces multiple requests into one draw per frame', async () => {
    const draws: string[] = [];
    const scheduler = new RenderScheduler((reasons) => {
      draws.push([...reasons].sort().join(','));
    });

    scheduler.request('viewport');
    scheduler.request('crosshair');
    expect(draws).toHaveLength(0);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(draws).toHaveLength(1);
    expect(draws[0]).toBe('crosshair,viewport');
    scheduler.dispose();
  });

  it('drawNow bypasses RAF coalescing', () => {
    const draws: number[] = [];
    const scheduler = new RenderScheduler(() => {
      draws.push(draws.length + 1);
    });

    scheduler.drawNow('data');
    scheduler.drawNow('viewport');
    expect(draws).toHaveLength(2);
    scheduler.dispose();
  });

  it('records draw phase timings', () => {
    const scheduler = new RenderScheduler(() => {});
    scheduler.recordPhases({
      backgroundMs: 1,
      gridMs: 2,
      candlesMs: 3,
      indicatorsMs: 4,
      drawingsMs: 5,
      axesMs: 6,
      totalMs: 21,
    });
    expect(scheduler.getLastPhases().totalMs).toBe(21);
    scheduler.dispose();
  });
});

describe('invalidation helpers', () => {
  it('detects cheap interaction reasons', () => {
    expect(isCheapInteraction(new Set(['viewport']))).toBe(true);
    expect(isCheapInteraction(new Set(['viewport', 'crosshair']))).toBe(true);
    expect(isCheapInteraction(new Set(['data']))).toBe(false);
    expect(isCheapInteraction(new Set(['viewport', 'data']))).toBe(false);
  });

  it('reuses background cache for selection-only invalidation', () => {
    expect(canReuseBackgroundCache(new Set(['selection']))).toBe(true);
    expect(canReuseBackgroundCache(new Set(['viewport']))).toBe(false);
    expect(canReuseBackgroundCache(new Set(['size']))).toBe(false);
  });

  it('matches background layer invalidating reasons', () => {
    const background = STANDARD_CHART_LAYERS.find((layer) => layer.id === 'background');
    expect(background?.invalidatingReasons).toEqual(BACKGROUND_INVALIDATING);
    expect(canReuseLayerCache(BACKGROUND_INVALIDATING, new Set(['crosshair']))).toBe(true);
    expect(canReuseLayerCache(BACKGROUND_INVALIDATING, new Set(['theme']))).toBe(false);
  });
});
