import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawGrid,
  drawCandles,
  drawAxes,
  drawLastPrice,
  getColors,
} from './renderer';
import type { Candle, VisibleRange, Theme } from './contracts';

function createMockContext() {
  const ctx: any = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
  };
  ctx.strokeStyle = '';
  ctx.fillStyle = '';
  ctx.lineWidth = 1;
  ctx.font = '';
  ctx.lineDash = [];
  return ctx as CanvasRenderingContext2D;
}

const vp: VisibleRange = {
  startIndex: 0,
  endIndex: 3,
  priceMin: 0,
  priceMax: 100,
  width: 300,
  height: 200,
  xForIndex: (i) => i * 100,
  yForPrice: (p) => 200 - (p / 100) * 200,
  indexForX: (x) => Math.floor(x / 100),
  priceForY: (y) => ((200 - y) / 200) * 100,
};

const candles: Candle[] = [
  { t: 1, o: 10, h: 20, l: 5, c: 15 },
  { t: 2, o: 15, h: 25, l: 10, c: 20 },
  { t: 3, o: 20, h: 30, l: 15, c: 25 },
];

describe('getColors', () => {
  it('returns dark palette for dark theme', () => {
    const c = getColors('dark');
    expect(c.up).toBe('#22c55e');
    expect(c.grid).toBe('#374151');
  });
});

describe('drawGrid', () => {
  it('draws vertical and horizontal lines', () => {
    const ctx = createMockContext();
    drawGrid(ctx, vp, 300, 200, 'dark');
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe('drawCandles', () => {
  it('renders candle bodies for candle_solid type', () => {
    const ctx = createMockContext();
    drawCandles(ctx, candles, vp, 'dark', 'candle_solid');
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('renders OHLC ticks for ohlc type', () => {
    const ctx = createMockContext();
    drawCandles(ctx, candles, vp, 'dark', 'ohlc');
    // open/close ticks use moveTo/lineTo
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});

describe('drawAxes', () => {
  it('writes price and time labels', () => {
    const ctx = createMockContext();
    drawAxes(ctx, vp, 300, 200, 'dark', candles);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('draws axis strip backgrounds', () => {
    const ctx = createMockContext();
    drawAxes(ctx, vp, 300, 200, 'dark', candles);
    expect(ctx.fillRect).toHaveBeenCalledWith(250, 0, 50, 200);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 170, 250, 30);
  });
});

describe('drawLastPrice', () => {
  it('draws a horizontal line at last close price', () => {
    const ctx = createMockContext();
    drawLastPrice(ctx, 25, vp, 300, 'dark');
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(0, expect.any(Number));
    expect(ctx.lineTo).toHaveBeenCalledWith(300, expect.any(Number));
  });
});
