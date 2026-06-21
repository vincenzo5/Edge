import { describe, it, expect } from 'vitest';
import { distanceToSegment, pointInRect, HIT_TOLERANCE_PX } from './primitives';

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
});
