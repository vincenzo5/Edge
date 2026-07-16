import { describe, expect, it, afterEach } from 'vitest';
import type { Candle, VisibleRange } from '@edge/chart-core';
import { TIME_AXIS_HEIGHT, PRICE_AXIS_WIDTH } from '@edge/chart-core/layout';
import { mergeChartSettings } from '../chartSettings';
import {
  buildCandleGeometry,
  createEmptyBatch,
  isWebGLSupportedChartType,
} from './candleGeometry';
import {
  CandleWebGLRenderer,
  setWebGLCandlesPreferred,
  isWebGLCandlesPreferred,
} from './candleWebGL';
import { colorToRgba, withAlphaByte } from './webglContext';

function mockViewport(candleCount: number): VisibleRange {
  const width = 800;
  const height = 400;
  const startIndex = 0;
  const endIndex = Math.min(50, candleCount);
  const visible = endIndex - startIndex;
  const pw = width - PRICE_AXIS_WIDTH;
  const ph = height - TIME_AXIS_HEIGHT;
  return {
    startIndex,
    endIndex,
    priceMin: 90,
    priceMax: 110,
    width,
    height,
    xForIndex: (i: number) => ((i - startIndex) / visible) * pw,
    yForPrice: (p: number) => ((110 - p) / 20) * ph,
    indexForX: (x: number) => startIndex + (x / pw) * visible,
    priceForY: (y: number) => 110 - (y / ph) * 20,
  };
}

const sampleCandles: Candle[] = [
  { t: 1, o: 100, h: 105, l: 98, c: 102 },
  { t: 2, o: 102, h: 108, l: 101, c: 99 },
  { t: 3, o: 99, h: 103, l: 97, c: 101 },
];

describe('webglContext helpers', () => {
  it('parses hex colors to rgba', () => {
    expect(colorToRgba('#ff0000')).toEqual([1, 0, 0, 1]);
    expect(colorToRgba('#00ff0080')[3]).toBeCloseTo(0.502, 2);
  });

  it('appends alpha byte to hex colors', () => {
    expect(withAlphaByte('#26a69a', 0x33)).toBe('#26a69a33');
  });
});

describe('candleGeometry', () => {
  it('returns empty batch for zero visible span', () => {
    const vp = mockViewport(3);
    vp.endIndex = vp.startIndex;
    const batch = buildCandleGeometry(
      sampleCandles,
      vp,
      'candle_solid',
      mergeChartSettings(),
      'dark',
    );
    expect(batch.bodiesUp.vertexCount).toBe(0);
    expect(batch.bodiesDown.vertexCount).toBe(0);
  });

  it('builds body triangles for visible candles', () => {
    const batch = buildCandleGeometry(
      sampleCandles,
      mockViewport(3),
      'candle_solid',
      mergeChartSettings(),
      'dark',
    );
    expect(batch.bodiesUp.vertexCount + batch.bodiesDown.vertexCount).toBeGreaterThan(0);
    expect(batch.bodiesUp.vertices.length % 2).toBe(0);
  });

  it('builds area fill and stroke geometry', () => {
    const batch = buildCandleGeometry(
      sampleCandles,
      mockViewport(3),
      'area',
      mergeChartSettings(),
      'dark',
    );
    expect(batch.areaStroke.vertexCount).toBeGreaterThan(0);
    expect(batch.areaFill.vertexCount).toBeGreaterThan(0);
  });

  it('classifies supported chart types', () => {
    expect(isWebGLSupportedChartType('candle_solid')).toBe(true);
    expect(isWebGLSupportedChartType('candle_stroke')).toBe(false);
    expect(isWebGLSupportedChartType('ohlc')).toBe(true);
  });

  it('createEmptyBatch returns zeroed geometry', () => {
    const batch = createEmptyBatch();
    expect(batch.bodiesUp.vertexCount).toBe(0);
    expect(batch.wicksUp.vertexCount).toBe(0);
  });
});

describe('CandleWebGLRenderer', () => {
  afterEach(() => {
    setWebGLCandlesPreferred(null);
  });

  it('returns false from tryCreate when WebGL2 is unavailable (jsdom)', () => {
    const renderer = new CandleWebGLRenderer();
    expect(renderer.tryCreate()).toBe(false);
    expect(renderer.isReady()).toBe(false);
  });

  it('isWebGLCandlesPreferred respects test override', () => {
    setWebGLCandlesPreferred(true);
    expect(isWebGLCandlesPreferred()).toBe(true);
    setWebGLCandlesPreferred(false);
    expect(isWebGLCandlesPreferred()).toBe(false);
  });
});
