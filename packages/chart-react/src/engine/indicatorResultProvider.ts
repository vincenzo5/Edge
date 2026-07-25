import type { Candle, IndicatorConfig, ScriptExecutionErrorCode, ScriptObjectDef, ScriptObjectDrawEntry } from '@edge/chart-core';
import type { IndicatorPlugin } from '@edge/chart-core/plugin-api';
import { IndicatorRegistry } from '@edge/chart-core';
import type { CandleSeriesIdentity, ScriptManifest } from '@edge/chart-core';
import type { SeriesOutput } from '@edge/chart-core/legend/types';
import {
  candleTipRevisionFromSeries,
  candleValueFingerprint,
  computeTipStableCacheKey,
  getComputedSeries,
} from '@edge/chart-core/indicatorCompute';
import { manifestPlotToSeriesOutput } from '@edge/chart-core';
import { resolveIndicatorInputs, stableStringifyInputs } from '@edge/chart-core/indicatorInputs';

export type IndicatorResultState = 'ready' | 'stale' | 'calculating' | 'error';

export type IndicatorResultSnapshot = {
  generation: number;
  state: IndicatorResultState;
  series: Record<string, number[]> | null;
  objects?: Record<string, ScriptObjectDef>;
  fingerprint: string;
  revision?: string;
  sessionKey?: string;
  error?: string;
  errorCode?: ScriptExecutionErrorCode;
};

export type IndicatorResultProviderOptions = {
  sessionKey?: string;
};

function isScriptInstance(instance: IndicatorConfig): boolean {
  return instance.kind === 'script' || Boolean(instance.scriptId);
}

export function buildInstanceFingerprint(
  instance: IndicatorConfig,
  plugin: IndicatorPlugin,
  candles: Candle[],
  identity?: CandleSeriesIdentity,
): string {
  const inputs = resolveIndicatorInputs(plugin, instance);
  const base = computeTipStableCacheKey(plugin.name, inputs, candles, identity);
  const withTip = `${base}|tip:${identity?.tipRevision ?? candleTipRevisionFromSeries(candles)}`;
  if (isScriptInstance(instance)) {
    return `${withTip}|script:${instance.scriptId ?? instance.id}|rev:${instance.revision ?? 'unknown'}`;
  }
  return withTip;
}

export function scriptManifestToPlugin(manifest: ScriptManifest, instanceName: string): IndicatorPlugin {
  const outputs: SeriesOutput[] = Object.entries(manifest.plots).map(([plotId, plot]) =>
    manifestPlotToSeriesOutput(plotId, plot, plotId),
  );
  return {
    name: instanceName,
    category: 'Other',
    description: manifest.name,
    pane: manifest.pane,
    inputSchema: manifest.inputs,
    outputs,
  };
}

/**
 * Unified indicator result cache/coordinator.
 * Built-ins resolve synchronously via adapter; script instances read async snapshots.
 */
export class IndicatorResultProvider {
  private readonly snapshots = new Map<string, IndicatorResultSnapshot>();
  private generation = 0;
  private readonly sessionKey: string;
  private readonly listeners = new Set<() => void>();
  private seriesIdentity: CandleSeriesIdentity | undefined;

  constructor(options: IndicatorResultProviderOptions = {}) {
    this.sessionKey = options.sessionKey ?? 'default';
  }

  setSeriesIdentity(identity: CandleSeriesIdentity | undefined): void {
    this.seriesIdentity = identity;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getSnapshot(instanceId: string): IndicatorResultSnapshot | undefined {
    return this.snapshots.get(instanceId);
  }

  /** Sync adapter for trusted built-in plugins. */
  resolveBuiltinSeries(
    plugin: IndicatorPlugin,
    instance: IndicatorConfig,
    candles: Candle[],
  ): Record<string, number[]> | null {
    const fingerprint = buildInstanceFingerprint(instance, plugin, candles, this.seriesIdentity);
    const series = getComputedSeries(plugin, candles, undefined, instance, {
      identity: this.seriesIdentity,
      advanceKind: this.seriesIdentity?.lastAdvanceKind,
    });
    if (series) {
      this.snapshots.set(instance.id, {
        generation: ++this.generation,
        state: 'ready',
        series,
        fingerprint,
      });
    }
    return series;
  }

  /** Accept async script execution result; ignores stale generations. */
  setScriptSnapshot(
    instance: IndicatorConfig,
    params: {
      series: Record<string, number[]> | null;
      objects?: Record<string, ScriptObjectDef>;
      fingerprint: string;
      revision: string;
      state?: IndicatorResultState;
      error?: string;
      errorCode?: ScriptExecutionErrorCode;
      expectedSessionKey?: string;
    },
  ): boolean {
    if (params.expectedSessionKey && params.expectedSessionKey !== this.sessionKey) {
      return false;
    }
    const current = this.snapshots.get(instance.id);
    if (current && current.fingerprint === params.fingerprint && current.state === 'ready' && params.state === 'ready') {
      return true;
    }
    const nextGeneration = ++this.generation;
    this.snapshots.set(instance.id, {
      generation: nextGeneration,
      state: params.state ?? 'ready',
      series: params.series,
      objects: params.objects,
      fingerprint: params.fingerprint,
      revision: params.revision,
      sessionKey: this.sessionKey,
      error: params.error,
      errorCode: params.errorCode,
    });
    this.emitChange();
    return true;
  }

  markCalculating(instanceId: string, fingerprint: string): void {
    this.snapshots.set(instanceId, {
      generation: ++this.generation,
      state: 'calculating',
      series: this.snapshots.get(instanceId)?.series ?? null,
      fingerprint,
      sessionKey: this.sessionKey,
    });
    this.emitChange();
  }

  markStale(instanceId: string, error?: string): void {
    const current = this.snapshots.get(instanceId);
    if (!current) return;
    this.snapshots.set(instanceId, {
      ...current,
      state: 'stale',
      error,
    });
    this.emitChange();
  }

  /** Single read path for all chart consumers. */
  resolveSeries(
    plugin: IndicatorPlugin,
    instance: IndicatorConfig,
    candles: Candle[],
  ): Record<string, number[]> | null {
    const fingerprint = buildInstanceFingerprint(instance, plugin, candles, this.seriesIdentity);
    if (isScriptInstance(instance)) {
      const snap = this.snapshots.get(instance.id);
      if (!snap) return null;
      if (snap.fingerprint !== fingerprint) return snap.series;
      return snap.series;
    }
    const snap = this.snapshots.get(instance.id);
    if (snap?.fingerprint === fingerprint && snap.series) {
      return snap.series;
    }
    return this.resolveBuiltinSeries(plugin, instance, candles);
  }

  resolveScriptObjects(instanceId: string): Record<string, ScriptObjectDef> | undefined {
    return this.snapshots.get(instanceId)?.objects;
  }

  collectScriptObjectDrawEntries(
    indicators: IndicatorConfig[],
    candles: Candle[],
  ): ScriptObjectDrawEntry[] {
    const entries: ScriptObjectDrawEntry[] = [];
    for (const instance of indicators) {
      if (instance.visible === false) continue;
      if (!isScriptInstance(instance)) continue;
      const plugin = resolveIndicatorPlugin(instance);
      if (!plugin || plugin.pane !== 'main') continue;
      const fingerprint = buildInstanceFingerprint(instance, plugin, candles, this.seriesIdentity);
      const snap = this.snapshots.get(instance.id);
      if (!snap || snap.fingerprint !== fingerprint || !snap.objects) continue;
      for (const [objectId, def] of Object.entries(snap.objects)) {
        entries.push({ instanceId: instance.id, objectId, def });
      }
    }
    return entries;
  }

  clear(): void {
    this.snapshots.clear();
    this.generation = 0;
  }
}

let defaultProvider: IndicatorResultProvider | null = null;
const scriptPluginsByInstanceId = new Map<string, IndicatorPlugin>();

export function registerScriptIndicatorPlugin(instanceId: string, plugin: IndicatorPlugin): void {
  scriptPluginsByInstanceId.set(instanceId, plugin);
}

export function resolveIndicatorPlugin(instance: IndicatorConfig): IndicatorPlugin | undefined {
  if (isScriptInstance(instance)) {
    return scriptPluginsByInstanceId.get(instance.id);
  }
  return IndicatorRegistry.get(instance.name);
}

export function clearScriptIndicatorPlugins(): void {
  scriptPluginsByInstanceId.clear();
}

export function getDefaultIndicatorResultProvider(): IndicatorResultProvider {
  if (!defaultProvider) {
    defaultProvider = new IndicatorResultProvider();
  }
  return defaultProvider;
}

export function setDefaultIndicatorResultProvider(provider: IndicatorResultProvider | null): void {
  defaultProvider = provider;
}

export function resolveIndicatorResultProvider(
  provider?: IndicatorResultProvider | null,
): IndicatorResultProvider {
  return provider ?? getDefaultIndicatorResultProvider();
}

export function buildScriptFingerprint(
  revision: string,
  inputs: Record<string, unknown>,
  candles: Candle[],
): string {
  return `script|${revision}|${stableStringifyInputs(inputs as Record<string, import('@edge/chart-core').InputValue>)}|${candles.length}|${candleValueFingerprint(candles)}`;
}

export function numericSeriesFromScriptResult(
  series: Record<string, Array<number | null>>,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, values] of Object.entries(series)) {
    out[key] = values.map((v) => (v == null ? NaN : v));
  }
  return out;
}
