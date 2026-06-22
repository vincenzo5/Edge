import { describe, expect, it, vi } from 'vitest';
import type { VisibleRange } from '../contracts';
import type { IndicatorPlugin } from '../plugin-api';
import { drawFromOutputs, drawIndicator } from './draw';

function mockVp(): VisibleRange {
  return {
    startIndex: 0,
    endIndex: 10,
    priceMin: 0,
    priceMax: 100,
    width: 400,
    height: 200,
    xForIndex: (i) => i * 40,
    yForPrice: (p) => 200 - (p / 100) * 200,
    indexForX: (x) => Math.floor(x / 40),
    priceForY: (y) => ((200 - y) / 200) * 100,
  };
}

describe('drawFromOutputs fillBetween', () => {
  it('draws band between upper and lower series', () => {
    const fill = vi.fn();
    const closePath = vi.fn();

    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath,
      fill,
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawFromOutputs(
      ctx,
      mockVp(),
      'dark',
      { upper: [110, 112], lower: [90, 88] },
      [
        {
          id: 'upper',
          label: 'Upper',
          key: 'upper',
          plot: 'line',
          fillBetween: 'lower',
          fillColor: () => 'rgba(0,0,0,0.1)',
        },
        { id: 'lower', label: 'Lower', key: 'lower', plot: 'line' },
      ],
      new Map(),
      { id: '1', name: 'BOLL', pane: 'main' },
      { name: 'BOLL', category: 'Trend', description: '', pane: 'main' },
    );

    expect(closePath).toHaveBeenCalled();
    expect(fill).toHaveBeenCalled();
  });
});

describe('drawIndicator', () => {
  it('uses declarative path when draw is omitted', () => {
    const plugin: IndicatorPlugin = {
      name: 'Test',
      category: 'Other',
      description: '',
      pane: 'main',
      compute: () => ({ line: [1, 2, 3] }),
      outputs: [{ id: 'line', label: 'Line', key: 'line', plot: 'line' }],
    };

    const stroke = vi.fn();
    const ctx = {
      strokeStyle: '',
      lineWidth: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke,
    } as unknown as CanvasRenderingContext2D;

    drawIndicator(
      plugin,
      { id: 't', name: 'Test', pane: 'main' },
      ctx,
      [{ t: 1, o: 1, h: 2, l: 1, c: 1 }],
      mockVp(),
      'dark',
    );

    expect(stroke).toHaveBeenCalled();
  });

  it('calls custom draw when provided', () => {
    const customDraw = vi.fn();
    const plugin: IndicatorPlugin = {
      name: 'Custom',
      category: 'Other',
      description: '',
      pane: 'main',
      compute: () => ({ line: [1] }),
      outputs: [{ id: 'line', label: 'Line', key: 'line' }],
      draw: customDraw,
    };

    const ctx = {} as CanvasRenderingContext2D;
    drawIndicator(
      plugin,
      { id: 'c', name: 'Custom', pane: 'main' },
      ctx,
      [{ t: 1, o: 1, h: 2, l: 1, c: 1 }],
      mockVp(),
      'dark',
    );

    expect(customDraw).toHaveBeenCalled();
  });
});
