import { describe, it, expect } from 'vitest';
import { hitTestAll } from './pluginHost';
import { createViewport } from './viewport';
import type { Candle, SerializedDrawing } from './contracts';
import { trendLine } from './drawings/trend_line';
import { pointToPlot, yForPricePlot } from './drawingCoords';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115 },
];

function makeVp() {
  return createViewport(candles, 800, 400, 3, 0);
}

describe('hitTestAll', () => {
  it('returns topmost drawing by zLevel', () => {
    const vp = makeVp();
    const low: SerializedDrawing = {
      id: 'low',
      name: 'trend_line',
      label: 'Low',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 115, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const high: SerializedDrawing = {
      id: 'high',
      name: 'trend_line',
      label: 'High',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 115, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 5,
    };
    const a = pointToPlot(low.points[0], vp, candles);
    const b = pointToPlot(low.points[1], vp, candles);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const id = hitTestAll(midX, midY, [low, high], vp, candles);
    expect(id).toBe('high');
  });

  it('skips hidden and locked drawings', () => {
    const vp = makeVp();
    const hidden: SerializedDrawing = {
      id: 'hidden',
      name: 'trend_line',
      label: 'H',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 115, dataIndex: 2 },
      ],
      visible: false,
      locked: false,
      zLevel: 10,
    };
    const midX = vp.xForIndex(1);
    const midY = vp.yForPrice(108);
    expect(hitTestAll(midX, midY, [hidden], vp, candles)).toBeNull();
  });

  it('does not hit-test drawings outside the filtered pane set', () => {
    const vp = makeVp();
    const priceDrawing: SerializedDrawing = {
      id: 'price-line',
      name: 'trend_line',
      label: 'Price',
      paneId: 'price',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 115, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const subDrawing: SerializedDrawing = {
      id: 'rsi-line',
      name: 'horizontal_line',
      label: 'RSI H',
      paneId: 'rsi1',
      points: [{ timestamp: 2000, value: 50, dataIndex: 1 }],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const subY = yForPricePlot(50, vp, true);
    const priceOnly = hitTestAll(vp.xForIndex(1), subY, [priceDrawing], vp, candles);
    expect(priceOnly).toBeNull();
    const subOnly = hitTestAll(vp.xForIndex(1), subY, [subDrawing], vp, candles);
    expect(subOnly).toBe('rsi-line');
  });

  it('trend_line hitTest respects 4px tolerance', () => {
    const vp = makeVp();
    const d: SerializedDrawing = {
      name: 'trend_line',
      label: 'T',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 115, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const a = pointToPlot(d.points[0], vp, candles);
    const b = pointToPlot(d.points[1], vp, candles);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    expect(trendLine.hitTest(midX, midY, d, vp, candles)).toBe(true);
    expect(trendLine.hitTest(midX, midY + 10, d, vp, candles)).toBe(false);
  });
});
