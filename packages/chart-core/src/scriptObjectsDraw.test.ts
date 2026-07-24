import { describe, expect, it } from 'vitest';
import type { VisibleRange } from './contracts';
import { drawScriptObjects } from './scriptObjectsDraw';
import type { ScriptObjectDef } from './scriptContracts';
import { makeSyntheticCandles } from './scriptFixtures';

function mockVp(candleCount: number, width = 800, height = 400): VisibleRange {
  const barWidth = width / Math.max(candleCount, 1);
  return {
    width,
    height,
    startIndex: 0,
    endIndex: candleCount,
    yForPrice: (price: number) => height - price,
    priceForY: (y: number) => height - y,
    xForIndex: (index: number) => index * barWidth + barWidth / 2,
    indexForX: (x: number) => Math.floor(x / barWidth),
  } as VisibleRange;
}

describe('scriptObjectsDraw', () => {
  it('draws box, label, and level without throwing', () => {
    const candles = makeSyntheticCandles(50);
    const ctx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textBaseline: 'alphabetic',
      measureText: (text: string) => ({ width: text.length * 6 }),
      fillText: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
    } as unknown as CanvasRenderingContext2D;

    const objects: Record<string, ScriptObjectDef> = {
      zone: {
        kind: 'box',
        leftBar: 10,
        rightBar: 40,
        top: 190,
        bottom: 180,
        color: '#22c55e33',
        borderColor: '#22c55e',
      },
      note: {
        kind: 'label',
        bar: 40,
        price: 190,
        text: 'Break',
        color: '#e2e8f0',
        backgroundColor: '#0f172a88',
      },
      lvl: {
        kind: 'level',
        price: 185,
        leftBar: 0,
        rightBar: 40,
        color: '#f59e0b',
      },
    };

    expect(() =>
      drawScriptObjects(
        ctx,
        Object.entries(objects).map(([objectId, def]) => ({
          instanceId: 'inst-1',
          objectId,
          def,
        })),
        mockVp(candles.length),
        candles,
        'dark',
      ),
    ).not.toThrow();
  });
});
