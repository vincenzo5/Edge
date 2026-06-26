import { describe, expect, it, afterEach } from 'vitest';
import {
  IndicatorWebGLRenderer,
  isWebGLIndicatorsPreferred,
  setWebGLIndicatorsPreferred,
} from './indicatorWebGL';
import { isWebGLCompatibleIndicator } from './indicatorGeometry';
import { IndicatorRegistry } from '@edge/chart-core';

describe('IndicatorWebGLRenderer', () => {
  afterEach(() => {
    setWebGLIndicatorsPreferred(null);
  });

  it('returns false from tryCreate when WebGL2 is unavailable (jsdom)', () => {
    const renderer = new IndicatorWebGLRenderer();
    expect(renderer.tryCreate()).toBe(false);
    expect(renderer.isReady()).toBe(false);
  });

  it('isWebGLIndicatorsPreferred respects test override', () => {
    setWebGLIndicatorsPreferred(true);
    expect(isWebGLIndicatorsPreferred()).toBe(true);
    setWebGLIndicatorsPreferred(false);
    expect(isWebGLIndicatorsPreferred()).toBe(false);
  });

  it('classifies MA as WebGL-compatible and BOLL as canvas-only', () => {
    const ma = IndicatorRegistry.get('MA');
    const boll = IndicatorRegistry.get('BOLL');
    expect(ma && isWebGLCompatibleIndicator(ma)).toBe(true);
    expect(boll && isWebGLCompatibleIndicator(boll)).toBe(false);
  });
});
