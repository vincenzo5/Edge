import { describe, it, expect } from 'vitest';
import { createViewport } from '../viewport';
import type { Candle } from '../contracts';
import { trendLine } from './trend_line';
import { horizontalLine } from './hline';
import { rectangle } from './rect';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115 },
];

function vp() {
  return createViewport(candles, 800, 400, 3, 0);
}

describe('trend_line', () => {
  it('creates with two points', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const d = trendLine.create(start, vp(), candles);
    expect(d.points).toHaveLength(2);
    expect(d.name).toBe('trend_line');
  });

  it('getControlPoints returns two points', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const d = trendLine.create(start, vp(), candles);
    const cps = trendLine.getControlPoints!(d, vp(), candles);
    expect(cps).toHaveLength(2);
  });

  it('updatePreview moves second anchor to cursor', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let d = trendLine.create(start, vp(), candles);
    d = trendLine.updatePreview!(
      d,
      { timestamp: 3000, value: 115, dataIndex: 2 },
      vp(),
      candles,
    );
    expect(d.points[1]).toMatchObject({ timestamp: 3000, value: 115, dataIndex: 2 });
  });
});

describe('horizontal_line', () => {
  it('persists value only', () => {
    const start = { timestamp: 1000, value: 105, dataIndex: 0 };
    const d = horizontalLine.create(start, vp(), candles);
    expect(d.points[0].value).toBe(105);
  });
});

describe('rectangle', () => {
  it('updatePreview sets second corner', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let d = rectangle.create(start, vp(), candles);
    d = rectangle.updatePreview!(d, { timestamp: 3000, value: 115, dataIndex: 2 }, vp(), candles);
    expect(d.points[1].value).toBe(115);
  });

  it('getControlPoints returns four corners', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let d = rectangle.create(start, vp(), candles);
    d = rectangle.updatePreview!(d, { timestamp: 3000, value: 115, dataIndex: 2 }, vp(), candles);
    const cps = rectangle.getControlPoints!(d, vp(), candles);
    expect(cps).toHaveLength(4);
  });
});
