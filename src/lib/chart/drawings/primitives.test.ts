import { describe, it, expect, vi } from 'vitest';
import {
  drawControlPoints,
  CONTROL_POINT_RADIUS,
  distanceToSegment,
  pointInRect,
  HIT_TOLERANCE_PX,
} from './primitives';

describe('primitives', () => {
  it('distanceToSegment on line is zero', () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 10)).toBeCloseTo(0, 4);
  });

  it('distanceToSegment at 4px boundary', () => {
    const d = distanceToSegment(5, 4, 0, 0, 10, 0);
    expect(d).toBeCloseTo(4, 4);
    expect(d <= HIT_TOLERANCE_PX).toBe(true);
  });

  it('distanceToSegment off line beyond tolerance', () => {
    const d = distanceToSegment(0, 10, 0, 0, 10, 0);
    expect(d).toBeGreaterThan(HIT_TOLERANCE_PX);
  });

  it('pointInRect detects edge hit', () => {
    expect(pointInRect(0, 5, 0, 0, 10, 10)).toBe(true);
    expect(pointInRect(5, 5, 0, 0, 10, 10, false)).toBe(true);
    expect(pointInRect(50, 50, 0, 0, 10, 10)).toBe(false);
  });

  it('drawControlPoints renders circular handles', () => {
    const arc = vi.fn();
    const fill = vi.fn();
    const stroke = vi.fn();
    const ctx = {
      beginPath: vi.fn(),
      arc,
      fill,
      stroke,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;

    drawControlPoints(ctx, [{ x: 10, y: 20 }, { x: 30, y: 40 }], 'dark', true);

    expect(arc).toHaveBeenCalled();
    const radii = arc.mock.calls.map((call) => call[2]);
    expect(radii).toContain(CONTROL_POINT_RADIUS);
    expect(fill).toHaveBeenCalled();
    expect(stroke).toHaveBeenCalled();
  });

  it('drawControlPoints skips when not selected', () => {
    const arc = vi.fn();
    const ctx = {
      beginPath: vi.fn(),
      arc,
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawControlPoints(ctx, [{ x: 1, y: 2 }], 'dark', false);
    expect(arc).not.toHaveBeenCalled();
  });
});
