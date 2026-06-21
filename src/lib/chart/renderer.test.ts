import { describe, it, expect, vi } from 'vitest';
import {
  drawGrid,
  drawCandles,
  drawAxes,
  drawCrosshair,
  drawLastPrice,
  getColors,
} from './renderer';
import type { Candle, VisibleRange, Theme } from './contracts';
import { PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT, plotWidth, plotHeight } from './layout';

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
    measureText: vi.fn((text: string) => ({ width: text.length * 6 })),
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

  it('formats x-axis labels with real calendar dates', () => {
    const ctx = createMockContext();
    const datedMs = new Date(2024, 5, 15, 12, 0, 0).getTime();
    const datedCandles: Candle[] = [{ t: datedMs, o: 10, h: 20, l: 5, c: 15 }];
    const datedVp: VisibleRange = {
      ...vp,
      endIndex: 1,
      xForIndex: () => 50,
    };
    drawAxes(ctx, datedVp, 300, 200, 'dark', datedCandles, '1d');
    const labels = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);
    expect(labels.some((label: string) => /2024/.test(label))).toBe(true);
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

describe('drawCrosshair', () => {
  const width = 300;
  const height = 200;
  const pw = plotWidth(width);
  const ph = plotHeight(height);

  it('clips crosshair lines to plot area', () => {
    const ctx = createMockContext();
    drawCrosshair(ctx, 280, 190, vp, width, height, 'dark');
    expect(ctx.moveTo).toHaveBeenCalledWith(pw, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(pw, ph);
    expect(ctx.lineTo).toHaveBeenCalledWith(pw, expect.any(Number));
  });

  it('draws price and time badges on axis strips', () => {
    const ctx = createMockContext();
    drawCrosshair(ctx, 100, 80, vp, width, height, 'dark', 42.5, 'Jan 1, 2024');
    const labels = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((call) => ({
      text: call[0] as string,
      x: call[1] as number,
      y: call[2] as number,
    }));
    expect(labels.some((l) => l.text === '42.50' && l.x >= width - PRICE_AXIS_WIDTH)).toBe(true);
    expect(
      labels.some((l) => l.text === 'Jan 1, 2024' && l.y >= height - TIME_AXIS_HEIGHT),
    ).toBe(true);
  });
});
