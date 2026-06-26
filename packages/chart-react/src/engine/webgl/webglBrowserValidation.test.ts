import { describe, expect, it } from 'vitest';
import {
  buildWebGLCandleValidationReport,
} from './webglBrowserValidation';
import { setWebGLCandlesPreferred } from './candleWebGL';

describe('buildWebGLCandleValidationReport', () => {
  it('reports canvas fallback when flag is off', () => {
    setWebGLCandlesPreferred(false);
    const report = buildWebGLCandleValidationReport({
      chartType: 'candle_solid',
      renderer: null,
      candlesUseWebGL: false,
    });
    expect(report.flagEnabled).toBe(false);
    expect(report.activeBackend).toBe('canvas');
    expect(report.overlaysRemainOnCanvas).toBe(true);
    expect(report.passed).toBe(true);
    setWebGLCandlesPreferred(null);
  });

  it('reports canvas fallback with issues when flag is on but GL unavailable', () => {
    setWebGLCandlesPreferred(true);
    const report = buildWebGLCandleValidationReport({
      chartType: 'candle_solid',
      renderer: null,
      candlesUseWebGL: false,
    });
    expect(report.flagEnabled).toBe(true);
    expect(report.activeBackend).toBe('canvas');
    expect(report.issues.some((issue) => issue.includes('fallback'))).toBe(true);
    expect(report.passed).toBe(true);
    setWebGLCandlesPreferred(null);
  });

  it('flags unsupported chart types for canvas fallback', () => {
    setWebGLCandlesPreferred(true);
    const report = buildWebGLCandleValidationReport({
      chartType: 'candle_stroke',
      renderer: { isReady: () => true } as never,
      candlesUseWebGL: true,
    });
    expect(report.chartTypeSupported).toBe(false);
    expect(report.activeBackend).toBe('canvas');
    expect(report.issues.length).toBeGreaterThan(0);
    setWebGLCandlesPreferred(null);
  });
});
