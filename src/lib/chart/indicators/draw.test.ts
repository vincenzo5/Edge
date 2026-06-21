import { describe, it, expect } from 'vitest';
import { createViewport } from '../viewport';
import { drawLineSeries, drawHorizontalGuide } from './draw';

function mockCtx(): CanvasRenderingContext2D {
  return {
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillRect: () => {},
    closePath: () => {},
    fill: () => {},
  } as unknown as CanvasRenderingContext2D;
}

describe('indicator draw helpers', () => {
  it('drawLineSeries does not throw on empty values', () => {
    const ctx = mockCtx();
    const vp = createViewport([], 400, 200, 0);
    expect(() => drawLineSeries(ctx, [], vp, '#fff')).not.toThrow();
  });

  it('drawLineSeries skips NaN values', () => {
    const ctx = mockCtx();
    const values = [NaN, NaN, 10, 11, 12];
    const candles = values.map((c, i) => ({ t: i, o: c, h: c, l: c, c, v: 1 }));
    const vp = createViewport(candles, 400, 200, 5);
    expect(() => drawLineSeries(ctx, values, vp, '#fff')).not.toThrow();
  });

  it('drawHorizontalGuide does not throw', () => {
    const ctx = mockCtx();
    const candles = [{ t: 1, o: 10, h: 12, l: 9, c: 11 }];
    const vp = createViewport(candles, 400, 200, 1);
    expect(() => drawHorizontalGuide(ctx, vp, 10, '#999')).not.toThrow();
  });
});
