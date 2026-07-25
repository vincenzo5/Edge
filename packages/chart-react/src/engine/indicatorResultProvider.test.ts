import { describe, expect, it, beforeEach, vi } from 'vitest';
import { IndicatorRegistry } from '@edge/chart-core';
import { compileScript } from '@edge/indicator-runtime';
import { runCompileAndExecutePipeline } from '@edge/indicator-runtime';
import { SCRIPT_FIXTURES, makeSyntheticCandles } from '@edge/chart-core';
import {
  IndicatorResultProvider,
  buildInstanceFingerprint,
  numericSeriesFromScriptResult,
  registerScriptIndicatorPlugin,
  scriptManifestToPlugin,
  setDefaultIndicatorResultProvider,
  clearScriptIndicatorPlugins,
  resolveSeriesForFrame,
} from './indicatorResultProvider.js';
import { buildIndicatorDrawBatches } from './webgl/indicatorGeometry.js';
import { collectIndicatorAnnotations } from './priceAxisAnnotations.js';
import { resolveIndicatorLegend } from './legend.js';
import { applyPanePriceScale } from './indicatorScale.js';
import { mergeChartSettings } from './chartSettings.js';
import { attachViewportHelpers } from './viewport.js';
import type { IndicatorConfig, VisibleRange } from '@edge/chart-core';

const candles = makeSyntheticCandles(80);

function baseViewport(): VisibleRange {
  return attachViewportHelpers(
    {
      startIndex: 0,
      endIndex: candles.length - 1,
      priceMin: 90,
      priceMax: 110,
      barSpacing: 8,
      width: 800,
      height: 400,
    },
    candles.length,
  );
}

describe('IndicatorResultProvider', () => {
  beforeEach(() => {
    clearScriptIndicatorPlugins();
    setDefaultIndicatorResultProvider(new IndicatorResultProvider({ sessionKey: 'test-bridge' }));
  });

  it('resolves built-in MA through sync adapter', () => {
    const provider = new IndicatorResultProvider();
    const plugin = IndicatorRegistry.get('MA');
    expect(plugin).toBeTruthy();
    const instance: IndicatorConfig = {
      id: 'ma-1',
      name: 'MA',
      pane: 'main',
      inputs: { period: 20 },
    };
    const series = provider.resolveBuiltinSeries(plugin!, instance, candles);
    expect(series?.ma?.length).toBe(candles.length);
  });

  it('prepareFrame resolves each visible indicator once', () => {
    const provider = new IndicatorResultProvider();
    const maPlugin = IndicatorRegistry.get('MA')!;
    const emaPlugin = IndicatorRegistry.get('EMA')!;
    const instances: IndicatorConfig[] = [
      { id: 'ma-1', name: 'MA', pane: 'main', inputs: { period: 20 } },
      { id: 'ema-1', name: 'EMA', pane: 'main', inputs: { period: 12 } },
      { id: 'hidden', name: 'MA', pane: 'main', visible: false, inputs: { period: 5 } },
    ];
    const resolveSpy = vi.spyOn(provider, 'resolveSeries');

    const frame = provider.prepareFrame(instances, candles);

    expect(frame.size).toBe(2);
    expect(frame.get('ma-1')?.ma?.length).toBe(candles.length);
    expect(frame.get('ema-1')?.ema?.length).toBe(candles.length);
    expect(resolveSpy).toHaveBeenCalledTimes(2);
    resolveSpy.mockRestore();

    const maInstance = instances[0];
    const fromFrame = resolveSeriesForFrame(frame, provider, maPlugin, maInstance, candles);
    const resolveAgain = vi.spyOn(provider, 'resolveSeries');
    resolveSeriesForFrame(frame, provider, maPlugin, maInstance, candles);
    expect(fromFrame?.ma?.length).toBe(candles.length);
    expect(resolveAgain).not.toHaveBeenCalled();
    resolveAgain.mockRestore();
  });

  it('rejects stale script snapshots from another session', () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'session-a' });
    const instance: IndicatorConfig = {
      id: 'script-1',
      name: '__script_midpoint',
      pane: 'main',
      kind: 'script',
      scriptId: 'mid',
      revision: 'rev1',
    };
    const plugin = scriptManifestToPlugin(
      { name: 'Mid', pane: 'main', inputs: {}, plots: { midpoint: { kind: 'line', title: 'Mid' } } },
      instance.name,
    );
    const fp = buildInstanceFingerprint(instance, plugin, candles);
    const accepted = provider.setScriptSnapshot(instance, {
      series: { midpoint: candles.map((c) => c.c) },
      fingerprint: fp,
      revision: 'rev1',
      expectedSessionKey: 'session-b',
    });
    expect(accepted).toBe(false);
  });
});

describe('async bridge — one script result feeds all consumers', () => {
  beforeEach(() => {
    clearScriptIndicatorPlugins();
    setDefaultIndicatorResultProvider(new IndicatorResultProvider({ sessionKey: 'bridge-session' }));
  });

  it('line fixture reaches draw, scale, legend, annotations, and WebGL batches', async () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const pipeline = await runCompileAndExecutePipeline(
      fixture.source,
      candles,
      fixture.defaultInputs ?? {},
      'rev-line',
      'bridge-session',
    );
    expect(pipeline.compile.ok).toBe(true);
    expect(pipeline.execution?.status).toBe('ready');

    const manifest = pipeline.compile.manifest!;
    const instanceName = '__script_midpoint_bridge';
    const plugin = scriptManifestToPlugin(manifest, instanceName);
    const instance: IndicatorConfig = {
      id: 'script-bridge-1',
      name: instanceName,
      pane: 'main',
      kind: 'script',
      scriptId: 'midpoint-fixture',
      revision: pipeline.compile.artifactHash!,
      inputs: fixture.defaultInputs,
    };
    registerScriptIndicatorPlugin(instance.id, plugin);

    const provider = new IndicatorResultProvider({ sessionKey: 'bridge-session' });
    setDefaultIndicatorResultProvider(provider);
    const numeric = numericSeriesFromScriptResult(pipeline.execution!.series);
    const fingerprint = buildInstanceFingerprint(instance, plugin, candles);
    provider.setScriptSnapshot(instance, {
      series: numeric,
      fingerprint,
      revision: pipeline.compile.artifactHash!,
    });

    const resolved = provider.resolveSeries(plugin, instance, candles);
    expect(resolved?.midpoint?.length).toBe(candles.length);

    const vp = baseViewport();
    const theme = 'dark' as const;
    const settings = mergeChartSettings(undefined);

    const webglBatches = buildIndicatorDrawBatches([instance], candles, vp, theme);
    expect(webglBatches.length).toBeGreaterThan(0);

    const scaled = applyPanePriceScale(vp, candles, 'price', [instance], settings);
    expect(scaled.priceMin).toBeLessThan(scaled.priceMax);

    const legend = resolveIndicatorLegend(instance, candles, candles.length - 1, theme, settings);
    expect(legend?.some((s) => s.kind === 'value')).toBe(true);

    const annotations = collectIndicatorAnnotations([instance], candles, vp, settings, theme, 'price');
    expect(annotations.length).toBeGreaterThan(0);

    expect(webglBatches[0]?.type).toBe('line');
  });

  it('hline fixture does not require unused data series for guides', async () => {
    const fixture = SCRIPT_FIXTURES['hline-rsi-style'];
    const pipeline = await runCompileAndExecutePipeline(
      fixture.source,
      candles,
      fixture.defaultInputs ?? {},
      'rev-rsi',
      'bridge-session',
    );
    expect(pipeline.execution?.status).toBe('ready');
    const plugin = scriptManifestToPlugin(pipeline.compile.manifest!, '__script_rsi');
    registerScriptIndicatorPlugin('script-rsi-1', plugin);
    const instance: IndicatorConfig = {
      id: 'script-rsi-1',
      name: '__script_rsi',
      pane: 'sub',
      kind: 'script',
      scriptId: 'rsi-fixture',
      revision: pipeline.compile.artifactHash!,
    };
    const provider = new IndicatorResultProvider({ sessionKey: 'bridge-session' });
    setDefaultIndicatorResultProvider(provider);
    provider.setScriptSnapshot(instance, {
      series: numericSeriesFromScriptResult(pipeline.execution!.series),
      fingerprint: buildInstanceFingerprint(instance, plugin, candles),
      revision: pipeline.compile.artifactHash!,
    });
    const hlineOutputs = plugin.outputs?.filter((o) => o.plot === 'hline') ?? [];
    expect(hlineOutputs.length).toBeGreaterThanOrEqual(2);
    expect(hlineOutputs.every((o) => o.hlineAt != null)).toBe(true);
  });
});

describe('compileScript integration', () => {
  it('reports compile diagnostics for invalid fixture', () => {
    const result = compileScript(SCRIPT_FIXTURES['syntax-error'].source, { maxSourceBytes: 65536 });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.line).toBeGreaterThan(0);
  });
});
