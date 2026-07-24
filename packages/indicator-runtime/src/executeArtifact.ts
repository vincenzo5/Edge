import type { Candle } from '@edge/chart-core';
import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_RUNTIME_ABI,
  SCRIPT_SDK_VERSION,
  dedupeScriptSeriesKeys,
  isPrimaryScriptSeriesKey,
  peelScriptCalculateOutput,
  serializeScriptSeriesKey,
  type NormalizedScriptCandle,
  type ScriptCompileResult,
  type ScriptExecutionResult,
  type ScriptManifest,
  type ScriptObjectDef,
  type ScriptRuntimeBudgets,
  type ScriptSeriesContext,
  stableScriptInputsFingerprint,
  validateScriptExecutionResult,
  validateScriptAlertSeries,
} from '@edge/chart-core';
import { candleValueFingerprint } from '@edge/chart-core/indicatorCompute';
import { normalizeExecutableArtifact } from './compileScript.js';
import { GUEST_TA_BOOTSTRAP } from './guestTaBootstrap.js';
import { GUEST_LOCKDOWN_BOOTSTRAP } from './guestLockdown.js';
import {
  createRuntimeHost,
  isAbortError,
  type RuntimeHostHandle,
} from './runtimeHost.js';

export type ExecuteArtifactRequest = {
  artifact: string;
  manifest: ScriptManifest;
  candles: Candle[];
  inputs: Record<string, unknown>;
  revision: string;
  sessionKey: string;
  requestId?: string;
  expectedSessionKey?: string;
  budgets?: ScriptRuntimeBudgets;
  signal?: AbortSignal;
  seriesContext?: ScriptSeriesContext;
  secondarySeries?: Record<string, NormalizedScriptCandle[]>;
  secondarySeriesFingerprint?: string;
};

export type CollectScriptSeriesRequestsResult =
  | { ok: true; keys: string[] }
  | { ok: false; error: string; errorCode: ScriptExecutionResult['errorCode'] };

export type GuestCapabilityProbe = import('./guestGlobals.js').GuestCapabilityProbe;

export { probeGuestCapabilities, recoverFromWorkerCrash } from './runtimeHost.js';

function normalizeGuestCandles(candles: Candle[]): NormalizedScriptCandle[] {
  return candles.map((c) => ({
    t: c.t,
    o: c.o,
    h: c.h,
    l: c.l,
    c: c.c,
    v: c.v ?? 0,
  }));
}

function buildRequestBootstrap(
  seriesContext: ScriptSeriesContext | undefined,
  mode: 'collect' | 'execute',
  secondarySeries?: Record<string, NormalizedScriptCandle[]>,
): string {
  const contextJson = seriesContext
    ? JSON.stringify({
        symbol: seriesContext.symbol,
        interval: seriesContext.interval,
      })
    : 'null';

  if (mode === 'collect') {
    return `
const __seriesContext = ${contextJson};
const __recordedKeys = [];
const __request = {
  series(opts) {
    if (!__seriesContext) {
      throw new Error("request.series is unavailable without chart context");
    }
    const symbol = (opts && opts.symbol ? String(opts.symbol) : __seriesContext.symbol).toUpperCase();
    const interval = opts && opts.interval ? String(opts.interval) : __seriesContext.interval;
    const key = symbol + "|" + interval;
    if (__recordedKeys.indexOf(key) === -1) __recordedKeys.push(key);
    return __candles;
  },
};
`;
  }

  const secondaryJson = JSON.stringify(secondarySeries ?? {});
  return `
const __seriesContext = ${contextJson};
const __secondarySeries = ${secondaryJson};
const __request = {
  series(opts) {
    if (!__seriesContext) {
      throw new Error("request.series is unavailable without chart context");
    }
    const symbol = (opts && opts.symbol ? String(opts.symbol) : __seriesContext.symbol).toUpperCase();
    const interval = opts && opts.interval ? String(opts.interval) : __seriesContext.interval;
    const key = symbol + "|" + interval;
    if (key === (__seriesContext.symbol.toUpperCase() + "|" + __seriesContext.interval)) {
      return __candles;
    }
    if (__secondarySeries[key]) return __secondarySeries[key];
    throw new Error("Unknown series request: " + key);
  },
};
`;
}

function buildGuestCode(
  artifact: string,
  candles: Candle[],
  inputs: Record<string, unknown>,
  options?: {
    seriesContext?: ScriptSeriesContext;
    mode?: 'normal' | 'collect' | 'execute';
    secondarySeries?: Record<string, NormalizedScriptCandle[]>;
  },
): string {
  const normalized = normalizeGuestCandles(candles);
  const mode = options?.mode ?? 'normal';
  const requestBootstrap =
    mode === 'normal'
      ? ''
      : buildRequestBootstrap(options?.seriesContext, mode, options?.secondarySeries);

  const calculateCall =
    mode === 'collect'
      ? `
const __raw = __manifest.calculate(__candles, __inputs, __edgeTa, __request);
JSON.stringify({ keys: __recordedKeys });
`
      : mode === 'execute'
        ? `
const __raw = __manifest.calculate(__candles, __inputs, __edgeTa, __request);
JSON.stringify(__raw);
`
        : `
const __raw = __manifest.calculate(__candles, __inputs, __edgeTa);
JSON.stringify(__raw);
`;

  return `
"use strict";
${GUEST_LOCKDOWN_BOOTSTRAP}
${GUEST_TA_BOOTSTRAP}
const __candles = ${JSON.stringify(normalized)};
const __inputs = ${JSON.stringify(inputs)};
${requestBootstrap}
const __manifest = (function() {
${normalizeExecutableArtifact(artifact)}
})();
if (!__manifest || typeof __manifest.calculate !== "function") {
  throw new Error("Invalid manifest: calculate() required");
}
${calculateCall}
`;
}

function buildFingerprints(
  request: ExecuteArtifactRequest,
  budgets: ScriptRuntimeBudgets,
): ScriptExecutionResult['fingerprints'] {
  return {
    revision: request.revision,
    runtimeAbi: SCRIPT_RUNTIME_ABI,
    sdkVersion: SCRIPT_SDK_VERSION,
    inputsFingerprint: stableScriptInputsFingerprint(
      request.inputs as Record<string, import('@edge/chart-core').InputValue>,
    ),
    candleFingerprint: candleValueFingerprint(request.candles),
    secondarySeriesFingerprint: request.secondarySeriesFingerprint,
    sessionKey: request.sessionKey,
  };
}

function staleResponseError(
  request: ExecuteArtifactRequest,
  budgets: ScriptRuntimeBudgets,
): ScriptExecutionResult {
  return {
    status: 'error',
    series: {},
    plots: request.manifest?.plots ?? {},
    fingerprints: buildFingerprints(request, budgets),
    error: 'Stale execution response rejected',
    errorCode: 'validation',
  };
}

function runInGuest(
  host: RuntimeHostHandle,
  guestCode: string,
): { ok: true; json: string } | { ok: false; message: string; errorCode: ScriptExecutionResult['errorCode'] } {
  const evalResult = host.context.evalCode(guestCode);
  if (evalResult.error) {
    const dumped = host.context.dump(evalResult.error);
    evalResult.error.dispose();
    const message =
      typeof dumped === 'string'
        ? dumped
        : dumped instanceof Error
          ? dumped.message
          : JSON.stringify(dumped);
    const isTimeout =
      typeof message === 'string' &&
      (message.includes('interrupted') || message.includes('Interrupt'));
    return {
      ok: false,
      message,
      errorCode: isTimeout ? 'timeout' : 'runtime',
    };
  }
  const json = String(host.context.dump(evalResult.value));
  evalResult.value.dispose();
  return { ok: true, json };
}

function filterSecondaryKeys(
  keys: string[],
  seriesContext: ScriptSeriesContext,
  budgets: ScriptRuntimeBudgets,
): CollectScriptSeriesRequestsResult {
  const deduped = dedupeScriptSeriesKeys(keys);
  const secondary = deduped.filter((key) => !isPrimaryScriptSeriesKey(key, seriesContext));
  if (secondary.length > budgets.maxSecondarySeriesRequests) {
    return {
      ok: false,
      error: `Secondary series count ${secondary.length} exceeds limit ${budgets.maxSecondarySeriesRequests}`,
      errorCode: 'series-budget',
    };
  }
  return { ok: true, keys: secondary };
}

export async function collectScriptSeriesRequests(
  request: ExecuteArtifactRequest,
): Promise<CollectScriptSeriesRequestsResult> {
  const budgets = request.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS;
  if (!request.seriesContext) {
    return { ok: true, keys: [] };
  }

  if (request.expectedSessionKey && request.expectedSessionKey !== request.sessionKey) {
    return { ok: false, error: 'Stale execution response rejected', errorCode: 'validation' };
  }
  if (isAbortError(request.signal)) {
    return { ok: false, error: 'Execution cancelled', errorCode: 'cancelled' };
  }
  if (request.candles.length > budgets.maxCandleCount) {
    return {
      ok: false,
      error: `candle count ${request.candles.length} exceeds limit ${budgets.maxCandleCount}`,
      errorCode: 'limit',
    };
  }

  let host: RuntimeHostHandle | undefined;
  try {
    host = await createRuntimeHost(budgets, request.signal);
    const guestCode = buildGuestCode(request.artifact, request.candles, request.inputs, {
      seriesContext: request.seriesContext,
      mode: 'collect',
    });
    const guestResult = runInGuest(host, guestCode);
    if (!guestResult.ok) {
      return { ok: false, error: guestResult.message, errorCode: guestResult.errorCode };
    }

    let parsed: { keys?: unknown };
    try {
      parsed = JSON.parse(guestResult.json) as { keys?: unknown };
    } catch {
      return {
        ok: false,
        error: 'collect pass returned invalid JSON',
        errorCode: 'invalid-output',
      };
    }

    const rawKeys = Array.isArray(parsed.keys)
      ? parsed.keys.filter((key): key is string => typeof key === 'string')
      : [];

    host.dispose();
    host = undefined;

    const verifyHost = await createRuntimeHost(budgets, request.signal);
    const collectAgain = buildGuestCode(request.artifact, request.candles, request.inputs, {
      seriesContext: request.seriesContext,
      mode: 'collect',
    });
    const verifyResult = runInGuest(verifyHost, collectAgain);
    verifyHost.dispose();
    if (!verifyResult.ok) {
      return { ok: false, error: verifyResult.message, errorCode: verifyResult.errorCode };
    }
    let verifyParsed: { keys?: unknown };
    try {
      verifyParsed = JSON.parse(verifyResult.json) as { keys?: unknown };
    } catch {
      return {
        ok: false,
        error: 'collect verification returned invalid JSON',
        errorCode: 'series-unstable',
      };
    }
    const verifyKeys = Array.isArray(verifyParsed.keys)
      ? verifyParsed.keys.filter((key): key is string => typeof key === 'string')
      : [];
    const stable =
      rawKeys.length === verifyKeys.length &&
      rawKeys.every((key, index) => key === verifyKeys[index]);
    if (!stable) {
      return {
        ok: false,
        error: 'Series request set changed between collect passes',
        errorCode: 'series-unstable',
      };
    }

    return filterSecondaryKeys(rawKeys, request.seriesContext, budgets);
  } catch (err) {
    if (isAbortError(request.signal)) {
      return { ok: false, error: 'Execution cancelled', errorCode: 'cancelled' };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, errorCode: 'runtime' };
  } finally {
    host?.dispose();
  }
}

export async function executeArtifact(
  request: ExecuteArtifactRequest,
): Promise<ScriptExecutionResult> {
  const budgets = request.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS;
  const fingerprints = buildFingerprints(request, budgets);

  if (request.expectedSessionKey && request.expectedSessionKey !== request.sessionKey) {
    return staleResponseError(request, budgets);
  }

  if (isAbortError(request.signal)) {
    return {
      status: 'error',
      series: {},
      plots: request.manifest?.plots ?? {},
      fingerprints,
      error: 'Execution cancelled',
      errorCode: 'cancelled',
    };
  }

  if (request.candles.length > budgets.maxCandleCount) {
    return {
      status: 'error',
      series: {},
      plots: request.manifest?.plots ?? {},
      fingerprints,
      error: `candle count ${request.candles.length} exceeds limit ${budgets.maxCandleCount}`,
      errorCode: 'limit',
    };
  }

  let host: RuntimeHostHandle | undefined;
  try {
    host = await createRuntimeHost(budgets, request.signal);
    const mode = request.secondarySeries ? 'execute' : 'normal';
    const guestCode = buildGuestCode(request.artifact, request.candles, request.inputs, {
      seriesContext: request.seriesContext,
      mode,
      secondarySeries: request.secondarySeries,
    });
    const guestResult = runInGuest(host, guestCode);

    if (!guestResult.ok) {
      return {
        status: 'error',
        series: {},
        plots: request.manifest?.plots ?? {},
        fingerprints,
        error: guestResult.message,
        errorCode: guestResult.errorCode,
      };
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(guestResult.json) as Record<string, unknown>;
    } catch {
      return {
        status: 'error',
        series: {},
        plots: request.manifest?.plots ?? {},
        fingerprints,
        error: 'calculate() must return a JSON-serializable object',
        errorCode: 'invalid-output',
      };
    }

    const { seriesRaw, objectsRaw } = peelScriptCalculateOutput(raw);

    if (objectsRaw != null && (typeof objectsRaw !== 'object' || Array.isArray(objectsRaw))) {
      return {
        status: 'error',
        series: {},
        plots: request.manifest?.plots ?? {},
        fingerprints,
        error: 'calculate() objects must be a plain object map',
        errorCode: 'invalid-output',
      };
    }

    let objects: Record<string, ScriptObjectDef> | undefined;
    if (objectsRaw && Object.keys(objectsRaw).length > 0) {
      objects = {};
      for (const [objectId, value] of Object.entries(objectsRaw)) {
        if (!value || typeof value !== 'object') {
          return {
            status: 'error',
            series: {},
            plots: request.manifest?.plots ?? {},
            fingerprints,
            error: `object ${objectId} is invalid`,
            errorCode: 'invalid-output',
          };
        }
        const def = value as ScriptObjectDef;
        if (def.kind !== 'box' && def.kind !== 'label' && def.kind !== 'level') {
          return {
            status: 'error',
            series: {},
            plots: request.manifest?.plots ?? {},
            fingerprints,
            error: `object ${objectId} has unsupported kind`,
            errorCode: 'invalid-output',
          };
        }
        objects[objectId] = def;
      }
    }

    const series: Record<string, Array<number | null>> = {};
    for (const [key, value] of Object.entries(seriesRaw)) {
      if (!Array.isArray(value)) {
        return {
          status: 'error',
          series: {},
          plots: request.manifest?.plots ?? {},
          fingerprints,
          error: `series ${key} is not an array`,
          errorCode: 'invalid-output',
        };
      }
      series[key] = value.map((v) =>
        v == null ? null : typeof v === 'number' && Number.isFinite(v) ? v : null,
      );
    }

    const result: ScriptExecutionResult = {
      status: 'ready',
      series,
      plots: request.manifest?.plots ?? {},
      objects,
      fingerprints,
    };

    const manifestPane = request.manifest?.pane ?? 'main';
    const validation = validateScriptExecutionResult(result, request.candles.length, budgets, manifestPane);
    if (!validation.ok) {
      return {
        status: 'error',
        series: {},
        plots: request.manifest?.plots ?? {},
        fingerprints,
        error: validation.error,
        errorCode: validation.errorCode,
      };
    }

    if (request.manifest) {
      const alertValidation = validateScriptAlertSeries(request.manifest, series);
      if (!alertValidation.ok) {
        return {
          status: 'error',
          series: {},
          plots: request.manifest.plots ?? {},
          fingerprints,
          error: alertValidation.error,
          errorCode: 'invalid-output',
        };
      }
    }

    return result;
  } catch (err) {
    if (isAbortError(request.signal)) {
      return {
        status: 'error',
        series: {},
        plots: request.manifest?.plots ?? {},
        fingerprints,
        error: 'Execution cancelled',
        errorCode: 'cancelled',
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    const isMemory = message.toLowerCase().includes('memory');
    return {
      status: 'error',
      series: {},
      plots: request.manifest?.plots ?? {},
      fingerprints,
      error: message,
      errorCode: isMemory ? 'memory' : 'runtime',
    };
  } finally {
    host?.dispose();
  }
}

export type { ScriptCompileResult, ScriptExecutionResult, ScriptManifest };

export { serializeScriptSeriesKey };
