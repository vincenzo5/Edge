import { describe, expect, it } from 'vitest';
import {
  LayerRegistry,
  LAYER_PHASE_KEY,
  STANDARD_CHART_LAYERS,
  createCandlesLayer,
  registerWebGLCandlesLayer,
  createIndicatorsLayer,
  registerWebGLIndicatorsLayer,
  type ChartLayerId,
} from './layers';
import {
  BACKGROUND_INVALIDATING,
  canReuseBackgroundCache,
  canReuseLayerCache,
  canReuseSeriesCache,
} from './renderScheduler';

describe('LayerRegistry', () => {
  it('registers standard layers in z-order', () => {
    const registry = new LayerRegistry();
    const ids = registry.getAll().map((layer) => layer.id);
    expect(ids).toEqual([
      'background',
      'grid',
      'candles',
      'indicators',
      'drawings',
      'axes',
    ]);
  });

  it('returns layers sorted by z even when registered out of order', () => {
    const registry = new LayerRegistry();
    registry.register({
      id: 'axes',
      z: 50,
      backend: 'canvas',
      invalidatingReasons: new Set(),
      draw: () => {},
    });
    expect(registry.getAll().at(-1)?.id).toBe('axes');
  });

  it('maps every standard layer id to a draw phase timing key', () => {
    for (const layer of STANDARD_CHART_LAYERS) {
      expect(LAYER_PHASE_KEY[layer.id]).toBeDefined();
    }
  });

  it('marks interactive chrome layers as canvas-only backends', () => {
    const canvasOnly: ChartLayerId[] = ['drawings', 'axes'];
    for (const id of canvasOnly) {
      const layer = STANDARD_CHART_LAYERS.find((entry) => entry.id === id);
      expect(layer?.backend).toBe('canvas');
    }
  });
});

describe('layer invalidation metadata', () => {
  it('keeps background cache rules aligned with the background layer', () => {
    const background = STANDARD_CHART_LAYERS.find((layer) => layer.id === 'background');
    expect(background?.invalidatingReasons).toEqual(BACKGROUND_INVALIDATING);
    expect(canReuseBackgroundCache(new Set(['selection']))).toBe(true);
    expect(canReuseBackgroundCache(new Set(['viewport']))).toBe(false);
    expect(canReuseLayerCache(background!.invalidatingReasons, new Set(['selection']))).toBe(true);
  });

  it('allows series cache reuse for viewport-only invalidation', () => {
    expect(canReuseSeriesCache(new Set(['viewport']))).toBe(true);
    expect(canReuseSeriesCache(new Set(['data']))).toBe(false);
  });

  it('creates candles layer with explicit backend metadata', () => {
    const webglLayer = createCandlesLayer('webgl');
    expect(webglLayer.id).toBe('candles');
    expect(webglLayer.backend).toBe('webgl');
    const canvasLayer = createCandlesLayer('canvas');
    expect(canvasLayer.backend).toBe('canvas');
  });

  it('swaps candles layer backend via registerWebGLCandlesLayer', () => {
    const registry = new LayerRegistry();
    registerWebGLCandlesLayer(registry);
    expect(registry.get('candles')?.backend).toBe('webgl');
  });

  it('swaps indicators layer backend via registerWebGLIndicatorsLayer', () => {
    const registry = new LayerRegistry();
    registerWebGLIndicatorsLayer(registry);
    expect(registry.get('indicators')?.backend).toBe('webgl');
  });
});
