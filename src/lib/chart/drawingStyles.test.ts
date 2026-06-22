import { describe, it, expect } from 'vitest';
import { defaultStylesForTool, mergeStyles, resolveDrawingStyles } from './drawingStyles';
import { extendSegmentEndpoints } from './drawings/primitives';
import type { SerializedDrawing } from './contracts';

describe('drawingStyles', () => {
  it('mergeStyles shallow merges patches', () => {
    const base = defaultStylesForTool('trend_line');
    const merged = mergeStyles(base, { lineColor: '#00FF88', extendRight: true });
    expect(merged.lineColor).toBe('#00FF88');
    expect(merged.extendRight).toBe(true);
    expect(merged.lineWidth).toBe(1.5);
  });

  it('resolveDrawingStyles uses defaults for legacy drawings', () => {
    const d: SerializedDrawing = {
      name: 'trend_line',
      label: 'Trend',
      points: [],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const styles = resolveDrawingStyles(d, 'dark', false);
    expect(styles.lineColor).toBe('#64748b');
  });

  it('resolveDrawingStyles merges persisted styles', () => {
    const d: SerializedDrawing = {
      name: 'trend_line',
      label: 'Trend',
      points: [],
      visible: true,
      locked: false,
      zLevel: 0,
      styles: { lineColor: '#00FF88' },
    };
    const styles = resolveDrawingStyles(d, 'dark', false);
    expect(styles.lineColor).toBe('#00FF88');
  });

  it('extendSegmentEndpoints extends to plot edges when flags set', () => {
    const seg = extendSegmentEndpoints(100, 50, 200, 50, 800, 400, true, true, true);
    expect(seg.x1).toBe(0);
    expect(seg.x2).toBe(750);
    expect(seg.y1).toBe(50);
    expect(seg.y2).toBe(50);
  });
});
