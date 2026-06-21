import { describe, it, expect } from 'vitest';
import {
  pinchDistance,
  zoomFactorForPinchRatio,
  resolvePinchAction,
} from './pinch';

describe('pinchDistance', () => {
  it('returns zero for identical points', () => {
    expect(pinchDistance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });

  it('returns hypotenuse for offset points', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('zoomFactorForPinchRatio', () => {
  it('returns 1 for unit ratio', () => {
    expect(zoomFactorForPinchRatio(1)).toBe(1);
  });

  it('returns factor greater than 1 when spreading (ratio > 1)', () => {
    expect(zoomFactorForPinchRatio(1.1)).toBeGreaterThan(1);
  });

  it('returns factor less than 1 when pinching (ratio < 1)', () => {
    expect(zoomFactorForPinchRatio(0.9)).toBeLessThan(1);
  });

  it('returns 1 for invalid ratio', () => {
    expect(zoomFactorForPinchRatio(0)).toBe(1);
    expect(zoomFactorForPinchRatio(-1)).toBe(1);
    expect(zoomFactorForPinchRatio(NaN)).toBe(1);
  });
});

describe('resolvePinchAction', () => {
  it('returns zoom action with anchor when distance increases', () => {
    const result = resolvePinchAction(100, 120, 250);
    expect(result).not.toBeNull();
    expect(result!.action.type).toBe('zoom');
    expect(result!.action.factor).toBeGreaterThan(1);
    expect(result!.anchorX).toBe(250);
  });

  it('returns zoom out when distance decreases', () => {
    const result = resolvePinchAction(120, 100, 100);
    expect(result).not.toBeNull();
    expect(result!.action.factor).toBeLessThan(1);
  });

  it('returns null for zero distances', () => {
    expect(resolvePinchAction(0, 100, 50)).toBeNull();
    expect(resolvePinchAction(100, 0, 50)).toBeNull();
  });

  it('returns null when factor is negligible', () => {
    expect(resolvePinchAction(100, 100.05, 50)).toBeNull();
  });
});
