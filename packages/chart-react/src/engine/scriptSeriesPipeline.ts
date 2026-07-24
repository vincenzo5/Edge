import type { Candle, NormalizedScriptCandle, ScriptExecutionErrorCode, ScriptRuntimeBudgets, ScriptSeriesContext, ScriptSeriesResolver } from '@edge/chart-core';
import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  alignSeriesToPrimary,
  buildSecondarySeriesFingerprint,
  parseScriptSeriesKey,
} from '@edge/chart-core';
import { collectScriptSeriesRequests, executeArtifact } from '@edge/indicator-runtime';
import type { ScriptManifest } from '@edge/chart-core';

export type ResolvedSecondarySeries = {
  secondarySeries: Record<string, NormalizedScriptCandle[]>;
  fingerprint: string;
};

export type ResolveSecondarySeriesResult =
  | { ok: true; value: ResolvedSecondarySeries }
  | { ok: false; error: string; errorCode: ScriptExecutionErrorCode };

function withFetchTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Series fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Execution cancelled'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export async function resolveAlignedSecondarySeries(params: {
  artifact: string;
  manifest: ScriptManifest;
  candles: Candle[];
  inputs: Record<string, unknown>;
  revision: string;
  sessionKey: string;
  seriesContext: ScriptSeriesContext;
  resolver: ScriptSeriesResolver;
  budgets?: ScriptRuntimeBudgets;
  signal?: AbortSignal;
}): Promise<ResolveSecondarySeriesResult> {
  const budgets = params.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS;
  if (params.signal?.aborted) {
    return { ok: false, error: 'Execution cancelled', errorCode: 'cancelled' };
  }

  const collect = await collectScriptSeriesRequests({
    artifact: params.artifact,
    manifest: params.manifest,
    candles: params.candles,
    inputs: params.inputs,
    revision: params.revision,
    sessionKey: params.sessionKey,
    seriesContext: params.seriesContext,
    budgets,
    signal: params.signal,
  });

  if (!collect.ok) {
    return {
      ok: false,
      error: collect.error,
      errorCode: collect.errorCode ?? 'runtime',
    };
  }
  if (collect.keys.length === 0) {
    return { ok: true, value: { secondarySeries: {}, fingerprint: '' } };
  }

  const requests = collect.keys.map((key) => {
    const parsed = parseScriptSeriesKey(key);
    return { symbol: parsed.symbol, interval: parsed.interval };
  });

  let fetched: Map<string, Candle[]>;
  try {
    fetched = await withFetchTimeout(
      params.resolver(requests, params.seriesContext, params.signal),
      budgets.secondaryFetchTimeoutMs,
      params.signal,
    );
  } catch (err) {
    if (params.signal?.aborted) {
      return { ok: false, error: 'Execution cancelled', errorCode: 'cancelled' };
    }
    const message = err instanceof Error ? err.message : String(err);
    const errorCode: ScriptExecutionErrorCode = message.includes('timed out')
      ? 'timeout'
      : 'series-fetch';
    return { ok: false, error: message, errorCode };
  }

  const aligned: Record<string, NormalizedScriptCandle[]> = {};
  for (const key of collect.keys) {
    const raw = fetched.get(key);
    if (!raw) {
      return {
        ok: false,
        error: `Missing fetched series for ${key}`,
        errorCode: 'series-fetch',
      };
    }
    if (raw.length > budgets.maxSecondarySeriesBars) {
      return {
        ok: false,
        error: `Secondary series ${key} bar count ${raw.length} exceeds limit ${budgets.maxSecondarySeriesBars}`,
        errorCode: 'series-budget',
      };
    }
    aligned[key] = alignSeriesToPrimary(params.candles, raw);
  }

  return {
    ok: true,
    value: {
      secondarySeries: aligned,
      fingerprint: buildSecondarySeriesFingerprint(aligned),
    },
  };
}

export async function executeArtifactWithSecondarySeries(params: {
  artifact: string;
  manifest: ScriptManifest;
  candles: Candle[];
  inputs: Record<string, unknown>;
  revision: string;
  sessionKey: string;
  seriesContext?: ScriptSeriesContext;
  secondarySeries?: Record<string, NormalizedScriptCandle[]>;
  secondarySeriesFingerprint?: string;
  budgets?: ScriptRuntimeBudgets;
  signal?: AbortSignal;
}) {
  return executeArtifact({
    artifact: params.artifact,
    manifest: params.manifest,
    candles: params.candles,
    inputs: params.inputs,
    revision: params.revision,
    sessionKey: params.sessionKey,
    seriesContext: params.seriesContext,
    secondarySeries: params.secondarySeries,
    secondarySeriesFingerprint: params.secondarySeriesFingerprint,
    budgets: params.budgets,
    signal: params.signal,
  });
}
