import { describe, it, expect, vi } from 'vitest';
import { createViewport } from '../viewport';
import type { Candle, SerializedDrawing } from '../contracts';
import {
  ruler,
  formatRulerPriceLabels,
  formatRulerTimeLabel,
  formatRulerTooltipLines,
  rulerBarCount,
  sumRulerVolume,
} from '@edge/chart-core/drawings/ruler';
import { HIT_TOLERANCE_PX } from './primitives';

const candles: Candle[] = [
  { t: 1_000, o: 100, h: 110, l: 90, c: 105, v: 1_000_000 },
  { t: 86_401_000, o: 105, h: 115, l: 95, c: 110, v: 2_500_000 },
  { t: 172_801_000, o: 110, h: 120, l: 100, c: 115, v: 3_000_000 },
];

function draftWithPoints(
  a: { timestamp: number; value: number; dataIndex: number },
  b: { timestamp: number; value: number; dataIndex: number },
): SerializedDrawing {
  return {
    name: 'ruler',
    label: 'Ruler',
    points: [a, b],
    visible: true,
    locked: false,
    zLevel: 0,
  };
}

function vp() {
  return createViewport(candles, 800, 400, 3, 0);
}

describe('ruler drawing plugin', () => {
  it('creates a two-point draft with default fill styles', () => {
    const start = { timestamp: 1_000, value: 100, dataIndex: 0 };
    const draft = ruler.create(start, vp(), candles);
    expect(draft.name).toBe('ruler');
    expect(draft.points).toHaveLength(2);
    expect(draft.styles?.fillOpacity).toBeGreaterThan(0);
  });

  it('updates preview to track cursor on second point', () => {
    const start = { timestamp: 1_000, value: 100, dataIndex: 0 };
    const draft = ruler.create(start, vp(), candles);
    const cursor = { timestamp: 172_801_000, value: 115, dataIndex: 2 };
    const updated = ruler.updatePreview!(draft, cursor, vp(), candles);
    expect(updated.points[1]).toEqual(cursor);
  });

  it('formats price and percent labels', () => {
    const d = draftWithPoints(
      { timestamp: 1_000, value: 100, dataIndex: 0 },
      { timestamp: 86_401_000, value: 110, dataIndex: 1 },
    );
    expect(formatRulerPriceLabels(d)).toEqual({ priceLine: '+10.00', pctLine: '+10.00%' });
  });

  it('formats time label using interval', () => {
    const d = draftWithPoints(
      { timestamp: 0, value: 100, dataIndex: 0 },
      { timestamp: 3 * 24 * 60 * 60 * 1000, value: 110, dataIndex: 1 },
    );
    expect(formatRulerTimeLabel(d, '1d')).toBe('3d');
    expect(formatRulerTimeLabel(d, '15m')).toBe('72h');
  });

  it('counts bars inclusively between anchor indices', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    expect(rulerBarCount(d, candles)).toBe(3);
  });

  it('sums volume across selected bar range', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    expect(sumRulerVolume(d, candles)).toEqual({ total: 6_500_000, known: true });
  });

  it('resolves bar range and volume from timestamps when dataIndex is missing', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: -1 as unknown as number },
      { timestamp: candles[2]!.t, value: 115, dataIndex: -1 as unknown as number },
    );
    expect(rulerBarCount(d, candles)).toBe(3);
    expect(sumRulerVolume(d, candles)).toEqual({ total: 6_500_000, known: true });
  });

  it('always includes a volume line even when volume data is absent', () => {
    const noVolumeCandles: Candle[] = [
      { t: 1_000, o: 100, h: 110, l: 90, c: 105 },
      { t: 86_401_000, o: 105, h: 115, l: 95, c: 110 },
    ];
    const d = draftWithPoints(
      { timestamp: noVolumeCandles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: noVolumeCandles[1]!.t, value: 110, dataIndex: 1 },
    );
    expect(formatRulerTooltipLines(d, noVolumeCandles, '1d')).toEqual([
      '10.00 (10.00%)',
      '2 bars, 1d',
      'Vol —',
    ]);
  });

  it('formats TradingView-style tooltip with bars and volume', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    expect(formatRulerTooltipLines(d, candles, '1d')).toEqual([
      '15.00 (15.00%)',
      '3 bars, 2d',
      'Vol 6.5M',
    ]);
  });

  it('hit-tests shaded rectangle and diagonal', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    const [a, b] = ruler.getControlPoints!(d, vp(), candles, true);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    expect(ruler.hitTest(midX, midY, d, vp(), candles, true)).toBe(true);
    expect(ruler.hitTest(a.x, a.y, d, vp(), candles, true)).toBe(true);
    expect(ruler.hitTest(-100, -100, d, vp(), candles, true)).toBe(false);
  });

  it('draw renders labels and geometry without throwing', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    const fillRect = vi.fn();
    const strokeRect = vi.fn();
    const fillText = vi.fn();
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect,
      strokeRect,
      fillText,
      roundRect: vi.fn(),
      fill: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 6 }),
    } as unknown as CanvasRenderingContext2D;

    ruler.draw(ctx, d, vp(), 'dark', false, candles, { interval: '1d' });
    expect(fillRect).toHaveBeenCalled();
    expect(strokeRect).toHaveBeenCalled();
    expect(fillText).toHaveBeenCalled();
  });

  it('updateFromControl replaces the dragged anchor', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[2]!.t, value: 115, dataIndex: 2 },
    );
    const updated = ruler.updateFromControl!(d, 1, 400, 200, vp(), candles, true);
    expect(updated.points[1]?.value).not.toBe(115);
    expect(Math.abs((updated.points[1]?.value ?? 0) - 115)).toBeLessThan(50);
  });

  it('diagonal hit tolerates thin collapsed rulers', () => {
    const d = draftWithPoints(
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
      { timestamp: candles[0]!.t, value: 100, dataIndex: 0 },
    );
    const [a] = ruler.getControlPoints!(d, vp(), candles, true);
    expect(ruler.hitTest(a.x, a.y + HIT_TOLERANCE_PX / 2, d, vp(), candles, true)).toBe(true);
  });
});
