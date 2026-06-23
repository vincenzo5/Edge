import { describe, it, expect } from 'vitest';
import { attachViewportHelpers, createViewport } from './viewport';
import type { Candle, IndicatorConfig } from './contracts';
import { IndicatorRegistry } from './pluginHost';
import { resolveIndicatorInputs } from './indicatorInputs';
import {
  clampPlot,
  plotToPoint,
  pointToPlot,
  translateDrawingPoints,
  priceForPlotY,
  yForPricePlot,
  snapToOhlc,
  MAGNET_THRESHOLD_PX,
} from './drawingCoords';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115 },
];

function makeVp(width = 800, height = 400) {
  return createViewport(candles, width, height, 3, 0);
}

describe('drawingCoords', () => {
  it('clampPlot keeps coords inside plot area', () => {
    const c = clampPlot(900, 500, 800, 400, true);
    expect(c.x).toBeLessThanOrEqual(750);
    expect(c.y).toBeLessThanOrEqual(370);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeGreaterThanOrEqual(0);
  });

  it('yForPricePlot and priceForPlotY round-trip', () => {
    const vp = makeVp();
    const price = 105;
    const y = yForPricePlot(price, vp, true);
    const back = priceForPlotY(y, vp, true);
    expect(back).toBeCloseTo(price, 4);
  });

  it('plotToPoint and pointToPlot round-trip at candle center', () => {
    const vp = makeVp();
    const idx = 1;
    const plotX = vp.xForIndex(idx);
    const plotY = yForPricePlot(108, vp, true);
    const pt = plotToPoint(plotX, plotY, vp, candles, { magnet: false, snapXCandle: true });
    const back = pointToPlot(pt, vp, candles, true);
    expect(back.x).toBeCloseTo(plotX, 0);
    expect(back.y).toBeCloseTo(plotY, 0);
  });

  it('pointToPlot uses timestamp before stale dataIndex for anchored drawings', () => {
    const vp = makeVp();
    const back = pointToPlot(
      { timestamp: candles[2].t, value: 108, dataIndex: 0 },
      vp,
      candles,
      true
    );

    expect(back.x).toBeCloseTo(vp.xForIndex(2), 0);
  });

  it('translateDrawingPoints moves every anchor by the same plot delta', () => {
    const vp = makeVp();
    const points = [
      { timestamp: candles[0].t, value: 100, dataIndex: 0 },
      { timestamp: candles[1].t, value: 110, dataIndex: 1 },
    ];

    const moved = translateDrawingPoints(
      points,
      { x: vp.xForIndex(0), y: yForPricePlot(100, vp, true) },
      { x: vp.xForIndex(1), y: yForPricePlot(105, vp, true) },
      vp,
      candles,
      { showTimeAxis: true }
    );

    expect(moved[0].timestamp).toBe(candles[1].t);
    expect(moved[0].dataIndex).toBe(1);
    expect(moved[0].value).toBeCloseTo(105, 4);
    expect(moved[1].timestamp).toBe(candles[2].t);
    expect(moved[1].dataIndex).toBe(2);
    expect(moved[1].value).toBeCloseTo(115, 4);
  });

  it('magnet snaps to nearest OHLC within threshold', () => {
    const vp = makeVp();
    const candle = candles[1];
    const highY = yForPricePlot(candle.h, vp, true);
    const plotY = highY + 3;
    const snapped = snapToOhlc(plotY, 1, candle, vp, true, MAGNET_THRESHOLD_PX);
    expect(snapped).toBe(candle.h);
  });

  it('magnet does not snap when beyond threshold', () => {
    const vp = makeVp();
    const candle = candles[1];
    const highY = yForPricePlot(candle.h, vp, true);
    const plotY = highY + MAGNET_THRESHOLD_PX + 10;
    const snapped = snapToOhlc(plotY, 1, candle, vp, true, MAGNET_THRESHOLD_PX);
    expect(snapped).toBeCloseTo(priceForPlotY(plotY, vp, true), 4);
  });

  it('plotToPoint with magnet enabled snaps value', () => {
    const vp = makeVp();
    const idx = 1;
    const candle = candles[idx];
    const highY = yForPricePlot(candle.h, vp, true);
    const plotX = vp.xForIndex(idx);
    const pt = plotToPoint(plotX, highY + 2, vp, candles, { magnet: true, snapXCandle: true });
    expect(pt.value).toBe(candle.h);
  });

  it('plotToPoint handles virtual margin outside loaded candles', () => {
    const base = createViewport(candles, 800, 400, 3, 0);
    const vp = attachViewportHelpers({ ...base, startIndex: -20, endIndex: -10 }, candles.length);
    const pt = plotToPoint(vp.xForIndex(-15), yForPricePlot(108, vp, true), vp, candles);

    expect(pt.timestamp).toBe(candles[0].t);
    expect(pt.dataIndex).toBe(0);
    expect(Number.isFinite(pt.value)).toBe(true);
  });

  it('plotToPoint with magnet on sub-pane snaps to indicator value', () => {
    const baseVp = createViewport(candles, 800, 200, 3, 0);
    const vp = attachViewportHelpers(
      { ...baseVp, priceMin: 0, priceMax: 100, priceScaleMode: 'manual' },
      candles.length
    );
    const rsiIndicator: IndicatorConfig = {
      id: 'rsi1',
      name: 'RSI',
      pane: 'sub',
      params: { period: 2 },
      visible: true,
    };
    const idx = 2;
    const rsiPlugin = IndicatorRegistry.get('RSI');
    const indicatorValue = rsiPlugin?.valueAt?.(idx, candles, resolveIndicatorInputs(rsiPlugin, rsiIndicator));
    expect(indicatorValue).not.toBeNull();
    const plotX = vp.xForIndex(idx);
    const plotY = yForPricePlot(indicatorValue!, vp, false) + 2;
    const pt = plotToPoint(plotX, plotY, vp, candles, {
      magnet: true,
      snapXCandle: true,
      paneId: 'rsi1',
      indicators: [rsiIndicator],
      showTimeAxis: false,
    });
    expect(pt.value).toBeCloseTo(indicatorValue!, 4);
  });

  it('plotToPoint and pointToPlot round-trip on sub-pane indicator scale', () => {
    const baseVp = createViewport(candles, 800, 200, 3, 0);
    const vp = attachViewportHelpers(
      { ...baseVp, priceMin: 0, priceMax: 100, priceScaleMode: 'manual' },
      candles.length
    );
    const rsiIndicator: IndicatorConfig = {
      id: 'rsi1',
      name: 'RSI',
      pane: 'sub',
      params: { period: 14 },
      visible: true,
    };
    const indicatorValue = 55;
    const idx = 1;
    const plotX = vp.xForIndex(idx);
    const plotY = yForPricePlot(indicatorValue, vp, false);
    const pt = plotToPoint(plotX, plotY, vp, candles, {
      magnet: false,
      snapXCandle: true,
      paneId: 'rsi1',
      indicators: [rsiIndicator],
      showTimeAxis: false,
    });
    expect(pt.value).toBeCloseTo(indicatorValue, 4);
    const back = pointToPlot(pt, vp, candles, false);
    expect(back.x).toBeCloseTo(plotX, 0);
    expect(back.y).toBeCloseTo(plotY, 0);
  });
});
