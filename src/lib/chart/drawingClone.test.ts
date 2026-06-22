import { describe, expect, it } from 'vitest';
import {
  cloneDrawingPayload,
  cloneDrawingsForPaste,
  DUPLICATE_ANCHOR,
  toClipboardItem,
} from './drawingClone';
import type { SerializedDrawing } from './contracts';

const base: SerializedDrawing = {
  id: 'd1',
  name: 'trend_line',
  label: 'Trend',
  points: [
    { timestamp: 1000, value: 100 },
    { timestamp: 2000, value: 110 },
  ],
  visible: true,
  locked: false,
  zLevel: 2,
  styles: { lineColor: '#fff', lineWidth: 2 },
};

describe('drawingClone', () => {
  it('toClipboardItem strips id and zLevel', () => {
    const item = toClipboardItem(base);
    expect(item).not.toHaveProperty('id');
    expect(item).not.toHaveProperty('zLevel');
    expect(item.label).toBe('Trend');
    expect(item.points).toHaveLength(2);
  });

  it('cloneDrawingPayload offset mode shifts timestamp and value ratio', () => {
    const clone = cloneDrawingPayload(base, {
      newId: 'd2',
      anchor: DUPLICATE_ANCHOR,
      zLevel: 5,
      labelSuffix: ' copy',
    });
    expect(clone.id).toBe('d2');
    expect(clone.zLevel).toBe(5);
    expect(clone.label).toBe('Trend copy');
    expect(clone.points[0].timestamp).toBe(1000 + 86400000);
    expect(clone.points[0].value).toBeCloseTo(100.5);
    expect(clone.points[0].dataIndex).toBeUndefined();
  });

  it('cloneDrawingPayload crosshair mode anchors first point', () => {
    const item = toClipboardItem(base);
    const clone = cloneDrawingPayload(item, {
      newId: 'd3',
      anchor: { mode: 'crosshair', timestamp: 5000, value: 50 },
      zLevel: 1,
    });
    expect(clone.points[0].timestamp).toBe(5000);
    expect(clone.points[0].value).toBe(50);
    expect(clone.points[1].timestamp).toBe(6000);
    expect(clone.points[1].value).toBe(60);
  });

  it('cloneDrawingsForPaste assigns sequential z-levels', () => {
    const items = [toClipboardItem(base), toClipboardItem({ ...base, id: 'x', label: 'B' })];
    const out = cloneDrawingsForPaste(
      items,
      { mode: 'crosshair', timestamp: 0, value: 0 },
      10,
      () => `id_${Math.random()}`,
    );
    expect(out).toHaveLength(2);
    expect(out[0].zLevel).toBe(10);
    expect(out[1].zLevel).toBe(11);
  });
});
