import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
  countScriptMarkers,
  compactScriptBgcolorSegments,
  estimateScriptOutputBytes,
  evaluateScriptColorRules,
  formatScriptError,
  manifestPlotToSeriesOutput,
  normalizeScriptBoxBounds,
  peelScriptCalculateOutput,
  validateParamDef,
  validateScriptExecutionResult,
  validateScriptManifest,
  validateScriptObjects,
  stableScriptInputsFingerprint,
} from './scriptContracts';
import { SCRIPT_FIXTURES, makeSyntheticCandles } from './scriptFixtures';

describe('scriptContracts', () => {
  it('validates a minimal manifest', () => {
    const manifest = {
      name: 'Test',
      pane: 'main' as const,
      inputs: {},
      plots: {
        line: { kind: 'line' as const, title: 'Line', color: '#fff' },
      },
    };
    expect(validateScriptManifest(manifest)).toBe(true);
  });

  it('validates all input kinds', () => {
    expect(
      validateScriptManifest({
        name: 'Inputs',
        pane: 'main',
        inputs: {
          period: { kind: 'number', label: 'Period', default: 14, min: 1 },
          smooth: { kind: 'boolean', label: 'Smooth', default: true },
          mode: {
            kind: 'enum',
            label: 'Mode',
            default: 'fast',
            options: [
              { value: 'fast', label: 'Fast' },
              { value: 'slow', label: 'Slow' },
            ],
          },
          src: { kind: 'source', label: 'Source', default: 'close' },
        },
        plots: { line: { kind: 'line', title: 'Line', color: '#fff' } },
      }),
    ).toBe(true);
  });

  it('rejects invalid input defs', () => {
    expect(validateParamDef({ kind: 'enum', label: 'X', default: 'a', options: [] })).toBe(false);
    expect(validateParamDef({ kind: 'source', label: 'X', default: 'invalid' })).toBe(false);
    expect(
      validateScriptManifest({
        name: 'Bad',
        pane: 'main',
        inputs: { x: { kind: 'number', label: 'X' } },
        plots: { line: { kind: 'line', title: 'Line', color: '#fff' } },
      }),
    ).toBe(false);
  });

  it('validates bounded color rules', () => {
    expect(
      validateScriptManifest({
        name: 'Colors',
        pane: 'main',
        inputs: {},
        plots: {
          hist: {
            kind: 'histogram',
            title: 'Hist',
            color: '#888',
            colorRules: [
              { when: 'positive', color: '#0f0' },
              { when: 'negative', color: '#f00' },
            ],
          },
        },
      }),
    ).toBe(true);
    expect(evaluateScriptColorRules([{ when: 'gt', value: 0, color: '#0f0' }], 1, '#888')).toBe('#0f0');
    expect(evaluateScriptColorRules([{ when: 'gt', value: 0, color: '#0f0' }], -1, '#888')).toBe('#888');
  });

  it('formats typed script errors', () => {
    expect(formatScriptError('missing-revision', 'Unknown revision')).toContain('Missing script revision');
    expect(formatScriptError('limit')).toBe('Limit exceeded');
  });

  it('rejects function-valued colors in manifest validation indirectly via execution', () => {
    expect(
      validateScriptManifest({
        name: 'X',
        pane: 'main',
        inputs: {},
        plots: { a: { kind: 'line', title: 'A', color: '' } },
      }),
    ).toBe(false);
  });

  it('validates execution series length and finite values', () => {
    const candles = makeSyntheticCandles(10);
    const result = {
      status: 'ready' as const,
      series: { line: candles.map((c) => c.c) },
      plots: { line: { kind: 'line' as const, title: 'Line', color: '#fff' } },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: stableScriptInputsFingerprint({ period: 20 }),
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    expect(validateScriptExecutionResult(result, candles.length).ok).toBe(true);
  });

  it('rejects mismatched series length', () => {
    const result = {
      status: 'ready' as const,
      series: { line: [1, 2, 3] },
      plots: { line: { kind: 'line' as const, title: 'Line', color: '#fff' } },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: '',
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    const v = validateScriptExecutionResult(result, 10);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errorCode).toBe('invalid-output');
  });

  it('rejects series without matching plot', () => {
    const candles = makeSyntheticCandles(5);
    const result = {
      status: 'ready' as const,
      series: { orphan: candles.map(() => 1) },
      plots: { line: { kind: 'line' as const, title: 'Line', color: '#fff' } },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: '',
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    expect(validateScriptExecutionResult(result, candles.length).ok).toBe(false);
  });

  it('rejects output byte budget overflow', () => {
    const candles = makeSyntheticCandles(10);
    const series = { line: candles.map(() => 1) };
    const result = {
      status: 'ready' as const,
      series,
      plots: { line: { kind: 'line' as const, title: 'Line', color: '#fff' } },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: '',
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    expect(estimateScriptOutputBytes(series)).toBeGreaterThan(0);
    const v = validateScriptExecutionResult(result, candles.length, {
      ...DEFAULT_SCRIPT_RUNTIME_BUDGETS,
      maxOutputBytes: 10,
    });
    expect(v.ok).toBe(false);
  });

  it('maps manifest plots to SeriesOutput', () => {
    const out = manifestPlotToSeriesOutput('upper', {
      kind: 'band',
      title: 'Band',
      fillBetween: 'lower',
      fillColor: 'rgba(0,0,0,0.1)',
    }, 'upper');
    expect(out.plot).toBe('line');
    expect(out.fillBetween).toBe('lower');
  });

  it('validates marker, bgcolor, and style plots', () => {
    expect(
      validateScriptManifest({
        name: 'Visuals',
        pane: 'sub',
        inputs: {},
        plots: {
          buy: {
            kind: 'marker',
            title: 'Buy',
            color: '#0f0',
            shape: 'triangleUp',
            location: 'absolute',
          },
          tint: {
            kind: 'bgcolor',
            title: 'Tint',
            color: 'rgba(0,0,0,0.1)',
            opacity: 0.1,
          },
          line: { kind: 'line', title: 'Line', color: '#fff', style: 'stepline' },
        },
      }),
    ).toBe(true);
    expect(
      validateScriptManifest({
        name: 'Bad marker',
        pane: 'sub',
        inputs: {},
        plots: { buy: { kind: 'marker', title: 'Buy', color: '#0f0' } },
      }),
    ).toBe(false);
    expect(
      validateScriptManifest({
        name: 'Bad barcolor',
        pane: 'sub',
        inputs: {},
        plots: { tint: { kind: 'barcolor', title: 'Tint', color: '#f00' } },
      }),
    ).toBe(false);
  });

  it('maps marker and bgcolor plots to SeriesOutput metadata', () => {
    const marker = manifestPlotToSeriesOutput(
      'buy',
      {
        kind: 'marker',
        title: 'Buy',
        color: '#0f0',
        shape: 'triangleUp',
        location: 'aboveBar',
        size: 8,
      },
      'buy',
    );
    expect(marker.plot).toBe('marker');
    expect(marker.legendMode).toBe('signal');
    expect(marker.excludeFromScale).toBe(true);

    const tint = manifestPlotToSeriesOutput(
      'tint',
      { kind: 'bgcolor', title: 'Tint', color: 'rgba(0,0,0,0.1)', opacity: 0.1 },
      'tint',
    );
    expect(tint.plot).toBe('bgcolor');
    expect(tint.excludeFromScale).toBe(true);
  });

  it('enforces marker and bgcolor budgets', () => {
    const candles = makeSyntheticCandles(10);
    const markers = candles.map((_, i) => (i % 2 === 0 ? 1 : null));
    const result = {
      status: 'ready' as const,
      series: { buy: markers },
      plots: {
        buy: {
          kind: 'marker' as const,
          title: 'Buy',
          color: '#0f0',
          shape: 'triangleUp' as const,
          location: 'absolute' as const,
        },
      },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: '',
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    expect(validateScriptExecutionResult(result, candles.length).ok).toBe(true);
    const tooMany = {
      ...result,
      series: { buy: new Array(DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxMarkersPerSeries + 1).fill(1) },
    };
    const v = validateScriptExecutionResult(tooMany, tooMany.series.buy.length, {
      ...DEFAULT_SCRIPT_RUNTIME_BUDGETS,
      maxCandleCount: tooMany.series.buy.length + 1,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errorCode).toBe('limit');

    const segments = compactScriptBgcolorSegments(
      [1, 1, null, 1, 1, 1],
      () => '#f00',
      0,
      6,
      1,
    );
    expect(segments.length).toBe(2);
    expect(countScriptMarkers([null, 1, 0, 2, null])).toBe(2);
  });

  it('freezes language and sdk version constants', () => {
    expect(SCRIPT_LANGUAGE_VERSION).toBe('edge-script-ts-1');
    expect(SCRIPT_SDK_VERSION).toBe('edge-indicator-sdk-6');
    expect(DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxPlotCount).toBeGreaterThan(0);
    expect(DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxCandleCount).toBeGreaterThan(0);
    expect(DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxOutputBytes).toBeGreaterThan(0);
    expect(DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxScriptObjects).toBe(64);
  });

  it('peels objects from calculate output', () => {
    const peeled = peelScriptCalculateOutput({
      line: [1, 2, 3],
      objects: { box1: { kind: 'box', leftBar: 0, rightBar: 1, top: 2, bottom: 1 } },
    });
    expect(Object.keys(peeled.seriesRaw)).toEqual(['line']);
    expect(peeled.objectsRaw?.box1).toBeTruthy();
  });

  it('validates script objects on main pane only', () => {
    const candles = makeSyntheticCandles(50);
    const objects = {
      zone: {
        kind: 'box' as const,
        leftBar: 10,
        rightBar: 40,
        top: 190,
        bottom: 180,
        color: '#22c55e33',
      },
      note: {
        kind: 'label' as const,
        bar: 40,
        price: 190,
        text: 'Break',
      },
      lvl: {
        kind: 'level' as const,
        price: 185,
        leftBar: 0,
        rightBar: 40,
      },
    };
    expect(validateScriptObjects(objects, candles.length, DEFAULT_SCRIPT_RUNTIME_BUDGETS, 'main').ok).toBe(
      true,
    );
    expect(validateScriptObjects(objects, candles.length, DEFAULT_SCRIPT_RUNTIME_BUDGETS, 'sub').ok).toBe(
      false,
    );
    expect(normalizeScriptBoxBounds(objects.zone).top).toBe(190);
    expect(normalizeScriptBoxBounds(objects.zone).bottom).toBe(180);
  });

  it('validates execution result with objects', () => {
    const candles = makeSyntheticCandles(50);
    const result = {
      status: 'ready' as const,
      series: { mid: candles.map((c) => c.c) },
      plots: { mid: { kind: 'line' as const, title: 'Mid', color: '#fff' } },
      objects: {
        zone: {
          kind: 'box' as const,
          leftBar: 10,
          rightBar: 40,
          top: 190,
          bottom: 180,
          color: '#22c55e33',
        },
      },
      fingerprints: {
        revision: 'abc',
        runtimeAbi: 'edge-indicator-runtime-1' as const,
        sdkVersion: SCRIPT_SDK_VERSION,
        inputsFingerprint: '',
        candleFingerprint: 'c1',
        sessionKey: 's1',
      },
    };
    expect(validateScriptExecutionResult(result, candles.length, DEFAULT_SCRIPT_RUNTIME_BUDGETS, 'main').ok).toBe(
      true,
    );
  });

  it('rejects object budget overflow', () => {
    const candles = makeSyntheticCandles(10);
    const objects: Record<string, { kind: 'level'; price: number }> = {};
    for (let i = 0; i < 65; i += 1) {
      objects[`lvl${i}`] = { kind: 'level', price: i };
    }
    const v = validateScriptObjects(objects, candles.length, DEFAULT_SCRIPT_RUNTIME_BUDGETS, 'main');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errorCode).toBe('limit');
  });

  it('documents golden fixture inventory', () => {
    expect(Object.keys(SCRIPT_FIXTURES).length).toBeGreaterThanOrEqual(12);
    expect(SCRIPT_FIXTURES['line-midpoint'].expectCompileOk).toBe(true);
    expect(SCRIPT_FIXTURES['syntax-error'].expectCompileOk).toBe(false);
    expect(SCRIPT_FIXTURES['import-rejected'].expectCompileOk).toBe(false);
  });
});
