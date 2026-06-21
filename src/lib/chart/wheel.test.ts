import { describe, it, expect } from 'vitest';
import {
  normalizeWheelDelta,
  resolveWheelAction,
  zoomFactorForDelta,
} from './wheel';

describe('normalizeWheelDelta', () => {
  it('scales line-mode deltas to pixels', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48);
  });

  it('passes pixel-mode deltas through unchanged', () => {
    expect(normalizeWheelDelta(-120, 0)).toBe(-120);
  });
});

describe('resolveWheelAction', () => {
  it('zooms on vertical-dominant scroll', () => {
    expect(resolveWheelAction(0, 100).type).toBe('zoom');
    expect(resolveWheelAction(2, 100).type).toBe('zoom');
  });

  it('pans on horizontal-dominant scroll', () => {
    const action = resolveWheelAction(80, 5);
    expect(action.type).toBe('pan');
    if (action.type === 'pan') expect(action.deltaX).toBe(80);
  });

  it('returns none for negligible movement', () => {
    expect(resolveWheelAction(0, 0).type).toBe('none');
  });

  it('zooms out when scrolling down', () => {
    const action = resolveWheelAction(0, 50);
    expect(action.type).toBe('zoom');
    if (action.type === 'zoom') expect(action.factor).toBeLessThan(1);
  });

  it('zooms in when scrolling up', () => {
    const action = resolveWheelAction(0, -50);
    expect(action.type).toBe('zoom');
    if (action.type === 'zoom') expect(action.factor).toBeGreaterThan(1);
  });
});

describe('zoomFactorForDelta', () => {
  it('returns factors greater than 1 when scrolling up', () => {
    expect(zoomFactorForDelta(-50)).toBeGreaterThan(1);
  });
});
