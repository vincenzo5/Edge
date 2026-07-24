import type { Candle, IndicatorConfig, ScriptExecutionErrorCode, ScriptObjectDef, ScriptSeriesContext, ScriptSeriesResolver, ScriptSourceResolver } from '@edge/chart-core';
import { formatScriptError } from '@edge/chart-core';
import type { IndicatorPlugin, InputValue } from '@edge/chart-core/plugin-api';
import { resolveIndicatorInputs } from '@edge/chart-core/indicatorInputs';
import {
  candleTipRevisionFromSeries,
  computeTipStableCacheKey,
} from '@edge/chart-core/indicatorCompute';
import { resolveScriptSource, type ResolvedScriptSource } from '@edge/chart-core';
import {
  buildInstanceFingerprint,
  numericSeriesFromScriptResult,
  registerScriptIndicatorPlugin,
  scriptManifestToPlugin,
  type IndicatorResultProvider,
  type IndicatorResultState,
} from './indicatorResultProvider';
import { runScriptPipeline } from './scriptRuntimeWorkerClient';
import { dispatchEdgeLocalError } from '../localErrorEvent';

const MAX_SCRIPT_RESULT_CACHE = 32;
/** Soft approximate byte budget for script result cache entries. */
const SCRIPT_RESULT_CACHE_SOFT_BYTES = 16 * 1024 * 1024;
const SCHEDULE_DEBOUNCE_MS = 150;

type CachedScriptResult = {
  fingerprint: string;
  tipRevision: string;
  revision: string;
  series: Record<string, number[]> | null;
  objects?: Record<string, ScriptObjectDef>;
  state: IndicatorResultState;
  error?: string;
  errorCode?: ScriptExecutionErrorCode;
  touchedAt: number;
  approxBytes: number;
};

type PendingRun = {
  requestId: string;
  fingerprint: string;
  abort: AbortController;
};

type DebouncedSchedule = {
  timer: ReturnType<typeof setTimeout>;
  instance: IndicatorConfig;
  candles: Candle[];
};

export type ScriptResultCoordinatorOptions = {
  provider: IndicatorResultProvider;
  sessionKey: string;
  onSnapshot?: () => void;
  onScriptResultReady?: (event: import('../types').ScriptResultReadyEvent) => void;
  scriptSourceResolver?: ScriptSourceResolver | null;
  seriesContext?: ScriptSeriesContext | null;
  seriesResolver?: ScriptSeriesResolver | null;
};

function isScriptInstance(instance: IndicatorConfig): boolean {
  return instance.kind === 'script' || Boolean(instance.scriptId);
}

function approxSeriesBytes(series: Record<string, number[]> | null): number {
  if (!series) return 0;
  let sum = 0;
  for (const arr of Object.values(series)) {
    sum += arr.length * 8;
  }
  return sum;
}

function stubScriptPlugin(
  instance: IndicatorConfig,
  resolved: ResolvedScriptSource,
): IndicatorPlugin {
  const plugin =
    resolved.manifest != null
      ? scriptManifestToPlugin(resolved.manifest, instance.name)
      : {
          name: instance.name,
          category: 'Other' as const,
          description: resolved.displayName,
          pane: instance.pane,
          defaultInputs: resolved.defaultInputs as Record<string, InputValue>,
          inputSchema: resolved.inputSchema,
          outputs: [],
        };
  if (resolved.inputSchema && !plugin.inputSchema) {
    return { ...plugin, inputSchema: resolved.inputSchema };
  }
  return plugin;
}

export class ScriptResultCoordinator {
  private readonly provider: IndicatorResultProvider;
  private readonly sessionKey: string;
  private readonly onSnapshot?: () => void;
  private readonly onScriptResultReady?: (event: import('../types').ScriptResultReadyEvent) => void;
  private readonly scriptSourceResolver?: ScriptSourceResolver | null;
  private readonly seriesContextRef: { current: ScriptSeriesContext | null };
  private readonly seriesResolverRef: { current: ScriptSeriesResolver | null };
  private readonly cache = new Map<string, CachedScriptResult>();
  private readonly lastValidByInstance = new Map<string, CachedScriptResult>();
  private readonly pending = new Map<string, PendingRun>();
  private readonly debounced = new Map<string, DebouncedSchedule>();
  private requestSeq = 0;

  constructor(options: ScriptResultCoordinatorOptions) {
    this.provider = options.provider;
    this.sessionKey = options.sessionKey;
    this.onSnapshot = options.onSnapshot;
    this.onScriptResultReady = options.onScriptResultReady;
    this.scriptSourceResolver = options.scriptSourceResolver;
    this.seriesContextRef = { current: options.seriesContext ?? null };
    this.seriesResolverRef = { current: options.seriesResolver ?? null };
  }

  setSeriesOptions(options: {
    seriesContext?: ScriptSeriesContext | null;
    seriesResolver?: ScriptSeriesResolver | null;
  }): void {
    if (options.seriesContext !== undefined) {
      this.seriesContextRef.current = options.seriesContext;
    }
    if (options.seriesResolver !== undefined) {
      this.seriesResolverRef.current = options.seriesResolver;
    }
  }

  private resolveSource(scriptId: string, revision: string): ResolvedScriptSource | null {
    return resolveScriptSource(scriptId, revision, this.scriptSourceResolver);
  }

  dispose(): void {
    for (const pending of this.pending.values()) {
      pending.abort.abort();
    }
    this.pending.clear();
    for (const entry of this.debounced.values()) {
      clearTimeout(entry.timer);
    }
    this.debounced.clear();
    this.cache.clear();
    this.lastValidByInstance.clear();
  }

  sync(instances: IndicatorConfig[], candles: Candle[]): void {
    const activeScriptIds = new Set<string>();
    for (const instance of instances) {
      if (!isScriptInstance(instance) || instance.visible === false) continue;
      if (!instance.scriptId || !instance.revision) continue;
      activeScriptIds.add(instance.id);
      this.scheduleInstance(instance, candles);
    }
    this.pruneRemovedInstances(activeScriptIds);
  }

  /** Visible for unit tests — script result cache map size. */
  getResultCacheSizeForTests(): number {
    return this.cache.size;
  }

  /** Visible for unit tests — last-valid map size. */
  getLastValidCountForTests(): number {
    return this.lastValidByInstance.size;
  }

  scheduleInstance(instance: IndicatorConfig, candles: Candle[]): void {
    const existingDebounce = this.debounced.get(instance.id);
    if (existingDebounce) {
      clearTimeout(existingDebounce.timer);
    }

    const timer = setTimeout(() => {
      this.debounced.delete(instance.id);
      this.runScheduleInstance(instance, candles);
    }, SCHEDULE_DEBOUNCE_MS);

    this.debounced.set(instance.id, { timer, instance, candles });
  }

  private buildTipStableCacheKey(
    instance: IndicatorConfig,
    plugin: IndicatorPlugin,
    candles: Candle[],
  ): string {
    const inputs = resolveIndicatorInputs(plugin, instance);
    const tipStable = computeTipStableCacheKey(plugin.name, inputs, candles);
    const contextSuffix = this.seriesContextRef.current
      ? `${this.seriesContextRef.current.symbol}|${this.seriesContextRef.current.interval}|${this.seriesContextRef.current.range}|${this.seriesContextRef.current.sessionMode ?? 'regular'}`
      : '';
    return `${instance.scriptId}|${instance.revision}|${tipStable}|${contextSuffix}`;
  }

  private pruneRemovedInstances(activeScriptIds: Set<string>): void {
    for (const id of [...this.lastValidByInstance.keys()]) {
      if (!activeScriptIds.has(id)) {
        this.lastValidByInstance.delete(id);
      }
    }

    for (const [id, pending] of [...this.pending.entries()]) {
      if (!activeScriptIds.has(id)) {
        pending.abort.abort();
        this.pending.delete(id);
      }
    }

    for (const [id, entry] of [...this.debounced.entries()]) {
      if (!activeScriptIds.has(id)) {
        clearTimeout(entry.timer);
        this.debounced.delete(id);
      }
    }
  }

  private runScheduleInstance(instance: IndicatorConfig, candles: Candle[]): void {
    const resolved = this.resolveSource(instance.scriptId!, instance.revision!);
    if (!resolved) {
      this.applyLastValidOrError(
        instance,
        formatScriptError('missing-revision', 'Unknown script revision'),
        candles,
        null,
        'missing-revision',
      );
      return;
    }

    const plugin = stubScriptPlugin(instance, resolved);
    const fingerprint = buildInstanceFingerprint(instance, plugin, candles);
    const cacheKey = this.buildTipStableCacheKey(instance, plugin, candles);
    const tipRevision = candleTipRevisionFromSeries(candles);

    const cached = this.cache.get(cacheKey);
    if (cached && cached.tipRevision === tipRevision) {
      this.applySnapshot(instance, cached, fingerprint);
      return;
    }

    const existing = this.pending.get(instance.id);
    if (existing?.fingerprint === fingerprint) return;

    if (existing) {
      existing.abort.abort();
      this.pending.delete(instance.id);
    }

    const requestId = `script-${++this.requestSeq}`;
    const abort = new AbortController();
    this.pending.set(instance.id, { requestId, fingerprint, abort });
    this.provider.markCalculating(instance.id, fingerprint);
    this.notify();

    void this.runInstance({
      instance,
      plugin,
      candles,
      source: resolved.source,
      fingerprint,
      cacheKey,
      tipRevision,
      revision: instance.revision!,
      requestId,
      signal: abort.signal,
    });
  }

  private async runInstance(params: {
    instance: IndicatorConfig;
    plugin: IndicatorPlugin;
    candles: Candle[];
    source: string;
    fingerprint: string;
    cacheKey: string;
    tipRevision: string;
    revision: string;
    requestId: string;
    signal: AbortSignal;
  }): Promise<void> {
    const {
      instance,
      plugin,
      candles,
      source,
      fingerprint,
      cacheKey,
      tipRevision,
      revision,
      requestId,
      signal,
    } = params;

    try {
      const inputs = resolveIndicatorInputs(plugin, instance);
      const result = await runScriptPipeline({
        requestId,
        source,
        candles,
        inputs,
        revision,
        sessionKey: this.sessionKey,
        signal,
        seriesContext: this.seriesContextRef.current ?? undefined,
        seriesResolver: this.seriesResolverRef.current ?? undefined,
      });

      const pending = this.pending.get(instance.id);
      if (!pending || pending.requestId !== requestId) return;
      this.pending.delete(instance.id);

      if (signal.aborted) return;

      const effective = result.effective;
      if (effective?.status === 'ready' && result.compile.ok && result.compile.manifest) {
        registerScriptIndicatorPlugin(
          instance.id,
          scriptManifestToPlugin(result.compile.manifest, instance.name),
        );
        const numeric = numericSeriesFromScriptResult(effective.series);
        const entry: CachedScriptResult = {
          fingerprint,
          tipRevision,
          revision: result.compile.artifactHash ?? revision,
          series: numeric,
          objects: effective.objects,
          state: 'ready',
          touchedAt: Date.now(),
          approxBytes: approxSeriesBytes(numeric),
        };
        this.putCache(cacheKey, entry);
        this.lastValidByInstance.set(instance.id, entry);
        this.applySnapshot(instance, entry, fingerprint);
        if (result.compile.manifest?.alerts && Object.keys(result.compile.manifest.alerts).length > 0) {
          this.onScriptResultReady?.({
            instance,
            manifest: result.compile.manifest,
            series: effective.series,
            candles,
          });
        }
        return;
      }

      const errorCode = effective?.errorCode ?? (result.compile.ok ? 'runtime' : 'compile');
      const errorMessage = formatScriptError(
        errorCode,
        effective?.error ??
          result.compile.diagnostics[0]?.message ??
          'Script failed',
      );

      if (this.lastValidByInstance.has(instance.id)) {
        const last = this.lastValidByInstance.get(instance.id)!;
        this.applySnapshot(
          instance,
          { ...last, state: 'stale', error: errorMessage, errorCode },
          fingerprint,
        );
        return;
      }

      this.applySnapshot(instance, {
        fingerprint,
        tipRevision,
        revision,
        series: null,
        state: 'error',
        error: errorMessage,
        errorCode,
        touchedAt: Date.now(),
        approxBytes: 0,
      }, fingerprint);
      dispatchEdgeLocalError({
        source: 'script',
        message: errorMessage,
        detail: errorCode,
      });
    } catch (err) {
      const pending = this.pending.get(instance.id);
      if (!pending || pending.requestId !== requestId) return;
      this.pending.delete(instance.id);
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Script failed';
      const errorCode: ScriptExecutionErrorCode = message.includes('worker') ? 'runtime' : 'runtime';
      this.applyLastValidOrError(
        instance,
        formatScriptError(errorCode, message),
        candles,
        fingerprint,
        errorCode,
      );
    }
  }

  private applyLastValidOrError(
    instance: IndicatorConfig,
    errorMessage: string,
    candles: Candle[],
    fingerprint: string | null,
    errorCode?: ScriptExecutionErrorCode,
  ): void {
    const resolved = instance.scriptId && instance.revision
      ? this.resolveSource(instance.scriptId, instance.revision)
      : null;
    const fp =
      fingerprint ??
      (resolved
        ? buildInstanceFingerprint(instance, stubScriptPlugin(instance, resolved), candles)
        : `script:${instance.id}`);

    if (this.lastValidByInstance.has(instance.id)) {
      const last = this.lastValidByInstance.get(instance.id)!;
      this.applySnapshot(instance, { ...last, state: 'stale', error: errorMessage, errorCode }, fp);
      return;
    }

    this.provider.setScriptSnapshot(instance, {
      series: null,
      fingerprint: fp,
      revision: instance.revision ?? '',
      state: 'error',
      error: errorMessage,
      errorCode,
      expectedSessionKey: this.sessionKey,
    });
    if (errorCode) {
      dispatchEdgeLocalError({
        source: 'script',
        message: errorMessage,
        detail: errorCode,
      });
    }
    this.notify();
  }

  private applySnapshot(
    instance: IndicatorConfig,
    entry: CachedScriptResult,
    fingerprint: string,
  ): void {
    this.provider.setScriptSnapshot(instance, {
      series: entry.series,
      objects: entry.objects,
      fingerprint,
      revision: entry.revision,
      state: entry.state,
      error: entry.error,
      errorCode: entry.errorCode,
      expectedSessionKey: this.sessionKey,
    });
    this.notify();
  }

  private totalCacheBytes(): number {
    let sum = 0;
    for (const entry of this.cache.values()) {
      sum += entry.approxBytes;
    }
    return sum;
  }

  private evictScriptCacheUntilWithinBudget(): void {
    while (
      this.cache.size > MAX_SCRIPT_RESULT_CACHE ||
      this.totalCacheBytes() > SCRIPT_RESULT_CACHE_SOFT_BYTES
    ) {
      let victimKey: string | null = null;
      let victimTouch = Infinity;
      let victimBytes = -Infinity;

      for (const [key, entry] of this.cache) {
        const shouldEvict =
          victimKey == null ||
          entry.touchedAt < victimTouch ||
          (entry.touchedAt === victimTouch && entry.approxBytes > victimBytes);
        if (shouldEvict) {
          victimKey = key;
          victimTouch = entry.touchedAt;
          victimBytes = entry.approxBytes;
        }
      }

      if (victimKey == null) break;
      this.cache.delete(victimKey);
    }
  }

  private putCache(key: string, entry: CachedScriptResult): void {
    this.cache.set(key, entry);
    this.evictScriptCacheUntilWithinBudget();
  }

  private notify(): void {
    this.onSnapshot?.();
  }
}
