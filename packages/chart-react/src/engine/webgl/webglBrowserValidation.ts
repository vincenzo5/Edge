import { isWebGLSupportedChartType } from './candleGeometry';
import { isWebGLCandlesPreferred, type CandleWebGLRenderer } from './candleWebGL';

/** Browser/dev validation report for the WebGL candle path. */
export type WebGLCandleValidationReport = {
  flagEnabled: boolean;
  rendererReady: boolean;
  activeBackend: 'webgl' | 'canvas';
  /** Event/reference overlays always render on Canvas 2D — invariant of the layer contract. */
  overlaysRemainOnCanvas: true;
  chartType: string;
  chartTypeSupported: boolean;
  issues: string[];
  passed: boolean;
};

export function buildWebGLCandleValidationReport(params: {
  chartType: string;
  renderer: CandleWebGLRenderer | null;
  candlesUseWebGL: boolean;
}): WebGLCandleValidationReport {
  const flagEnabled = isWebGLCandlesPreferred();
  const rendererReady = params.renderer?.isReady() ?? false;
  const chartTypeSupported = isWebGLSupportedChartType(params.chartType);
  const usingWebGL =
    flagEnabled &&
    params.candlesUseWebGL &&
    rendererReady &&
    chartTypeSupported;

  const issues: string[] = [];
  if (flagEnabled && !rendererReady) {
    issues.push('WebGL2 unavailable — Canvas fallback active');
  }
  if (flagEnabled && rendererReady && !chartTypeSupported) {
    issues.push(`Chart type "${params.chartType}" is not WebGL-backed — Canvas fallback active`);
  }

  const passed =
    !flagEnabled ||
    usingWebGL ||
    issues.some((issue) => issue.includes('fallback'));

  return {
    flagEnabled,
    rendererReady,
    activeBackend: usingWebGL ? 'webgl' : 'canvas',
    overlaysRemainOnCanvas: true,
    chartType: params.chartType,
    chartTypeSupported,
    issues,
    passed,
  };
}

/** Dev-only console summary when WebGL candles are enabled. */
export function logWebGLCandleValidation(report: WebGLCandleValidationReport): void {
  if (!report.flagEnabled) return;
  const label = report.passed ? 'WebGL candle validation OK' : 'WebGL candle validation';
  const detail = {
    backend: report.activeBackend,
    chartType: report.chartType,
    rendererReady: report.rendererReady,
    overlaysOnCanvas: report.overlaysRemainOnCanvas,
    issues: report.issues,
  };
  if (report.passed && report.activeBackend === 'webgl') {
    console.info(`[EdgeChart] ${label}`, detail);
  } else {
    console.warn(`[EdgeChart] ${label}`, detail);
  }
}
