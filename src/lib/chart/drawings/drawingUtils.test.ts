import { describe, it, expect } from 'vitest';
import { rectCornerPlots, updateRectFromCorner, baseDrawing } from './drawingUtils';

describe('rect corner helpers', () => {
  it('rectCornerPlots returns four corners', () => {
    const corners = rectCornerPlots({ x: 0, y: 0 }, { x: 100, y: 50 });
    expect(corners).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]);
  });

  it('updateRectFromCorner updates stored diagonal for corner 0', () => {
    const d = baseDrawing('rectangle', 'Rect', [
      { timestamp: 1000, value: 100, dataIndex: 0 },
      { timestamp: 3000, value: 120, dataIndex: 2 },
    ]);
    const next = updateRectFromCorner(d, 0, {
      timestamp: 1500,
      value: 105,
      dataIndex: 1,
    });
    expect(next.points[0]).toMatchObject({ timestamp: 1500, value: 105, dataIndex: 1 });
  });

  it('updateRectFromCorner updates mixed axes for derived corner 1', () => {
    const d = baseDrawing('rectangle', 'Rect', [
      { timestamp: 1000, value: 100, dataIndex: 0 },
      { timestamp: 3000, value: 120, dataIndex: 2 },
    ]);
    const next = updateRectFromCorner(d, 1, {
      timestamp: 2500,
      value: 90,
      dataIndex: 2,
    });
    expect(next.points[1].timestamp).toBe(2500);
    expect(next.points[0].value).toBe(90);
  });
});
