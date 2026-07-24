/**
 * Browser Web Worker client for compile+execute pipeline.
 * Falls back to main-thread ScriptSession when Worker is unavailable (Vitest/node).
 * When a series resolver is provided, orchestrates collect → fetch → execute on the main thread.
 */

import type { Candle, ScriptRuntimeBudgets, ScriptSeriesContext, ScriptSeriesResolver } from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS, packCandlesToTransferBuffer, SCRIPT_SDK_VERSION } from '@edge/chart-core';
import {
  compileScript,
  createScriptSession,
  markRuntimeRequestCancelled,
  type RuntimeWorkerCompileRequest,
  type RuntimeWorkerResponse,
} from '@edge/indicator-runtime';
import type { ScriptSessionEvaluateResult } from '@edge/indicator-runtime';
import {
  executeArtifactWithSecondarySeries,
  resolveAlignedSecondarySeries,
} from './scriptSeriesPipeline';

export type ScriptPipelineRequest = {
  requestId: string;
  source: string;
  candles: Candle[];
  inputs: Record<string, unknown>;
  revision: string;
  sessionKey: string;
  budgets?: ScriptRuntimeBudgets;
  signal?: AbortSignal;
  seriesContext?: ScriptSeriesContext;
  seriesResolver?: ScriptSeriesResolver | null;
};

const MAX_WORKER_RECOVERY_ATTEMPTS = 3;

let workerInstance: Worker | null = null;
let workerFailed = false;
let workerCrashCount = 0;
let workerDegraded = false;

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined' && !workerFailed && !workerDegraded;
}

function terminateWorker(): void {
  workerInstance?.terminate();
  workerInstance = null;
}

function ensureWorker(): Worker | null {
  if (!canUseWorker()) return null;
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(new URL('../workers/indicatorScriptRuntime.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerInstance.addEventListener('error', () => {
      workerCrashCount += 1;
      terminateWorker();
      if (workerCrashCount >= MAX_WORKER_RECOVERY_ATTEMPTS) {
        workerDegraded = true;
      }
    });
    return workerInstance;
  } catch {
    workerFailed = true;
    return null;
  }
}

function handleWorkerFailure(): void {
  workerCrashCount += 1;
  terminateWorker();
  if (workerCrashCount >= MAX_WORKER_RECOVERY_ATTEMPTS) {
    workerDegraded = true;
  }
}

export function isScriptRuntimeWorkerDegraded(): boolean {
  return workerDegraded;
}

type WorkerCandlePayload =
  | {
      candles: Candle[];
    }
  | {
      candlesEncoding: 'f64x6';
      candlesBuffer: ArrayBuffer;
      candleCount: number;
    };

function buildWorkerCandlePayload(candles: Candle[]): WorkerCandlePayload {
  try {
    const packed = packCandlesToTransferBuffer(candles);
    return {
      candlesEncoding: packed.encoding,
      candlesBuffer: packed.buffer,
      candleCount: packed.candleCount,
    };
  } catch {
    return { candles };
  }
}

function postWorkerCompileRequest(worker: Worker, workerRequest: RuntimeWorkerCompileRequest): void {
  if (
    workerRequest.candlesEncoding === 'f64x6' &&
    workerRequest.candlesBuffer &&
    workerRequest.candleCount != null
  ) {
    worker.postMessage(workerRequest, [workerRequest.candlesBuffer]);
    return;
  }
  worker.postMessage(workerRequest);
}

export async function runScriptPipeline(
  request: ScriptPipelineRequest,
): Promise<ScriptSessionEvaluateResult> {
  if (request.seriesResolver && request.seriesContext) {
    return runScriptPipelineWithSeries(request);
  }

  const worker = ensureWorker();
  if (!worker) {
    return runScriptPipelineMainThread(request);
  }

  if (request.signal?.aborted) {
    return runScriptPipelineMainThread(request);
  }

  const candlePayload = buildWorkerCandlePayload(request.candles);
  const workerRequest: RuntimeWorkerCompileRequest = {
    type: 'compile-and-run',
    requestId: request.requestId,
    source: request.source,
    ...candlePayload,
    inputs: request.inputs,
    revision: request.revision,
    sessionKey: request.sessionKey,
    budgets: request.budgets,
  };

  try {
    return await new Promise<ScriptSessionEvaluateResult>((resolve, reject) => {
      const onAbort = () => {
        markRuntimeRequestCancelled(request.requestId);
        worker.postMessage({ type: 'cancel', requestId: request.requestId });
      };
      request.signal?.addEventListener('abort', onAbort, { once: true });

      const handler = (event: MessageEvent<RuntimeWorkerResponse | { type: 'stale-rejected'; requestId: string }>) => {
        const data = event.data;
        if (!('requestId' in data) || data.requestId !== request.requestId) return;
        worker.removeEventListener('message', handler);
        request.signal?.removeEventListener('abort', onAbort);

        if (data.type === 'stale-rejected') {
          resolve({
            compile: { ok: false, diagnostics: [{ line: 1, column: 1, message: 'Stale session', severity: 'error' }] },
          });
          return;
        }

        const response = data as RuntimeWorkerResponse;
        resolve(pipelineResponseToSessionResult(response, request.sessionKey, request.signal));
      };

      worker.addEventListener('message', handler);
      worker.addEventListener(
        'error',
        () => {
          worker.removeEventListener('message', handler);
          request.signal?.removeEventListener('abort', onAbort);
          handleWorkerFailure();
          reject(new Error('Script runtime worker failed'));
        },
        { once: true },
      );
      postWorkerCompileRequest(worker, workerRequest);
    });
  } catch {
    handleWorkerFailure();
    return runScriptPipelineMainThread(request);
  }
}

async function runScriptPipelineWithSeries(
  request: ScriptPipelineRequest,
): Promise<ScriptSessionEvaluateResult> {
  const compile = compileScript(request.source, request.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS);
  if (request.signal?.aborted) {
    return {
      compile,
      effective: {
        status: 'error',
        series: {},
        plots: {},
        fingerprints: {
          revision: '',
          runtimeAbi: 'edge-indicator-runtime-1',
          sdkVersion: SCRIPT_SDK_VERSION,
          inputsFingerprint: '',
          candleFingerprint: '',
          sessionKey: request.sessionKey,
        },
        error: 'Execution cancelled',
        errorCode: 'cancelled',
      },
    };
  }

  if (!compile.ok || !compile.artifact || !compile.manifest || !compile.artifactHash) {
    return {
      compile,
      effective: {
        status: 'error',
        series: {},
        plots: {},
        fingerprints: {
          revision: '',
          runtimeAbi: 'edge-indicator-runtime-1',
          sdkVersion: SCRIPT_SDK_VERSION,
          inputsFingerprint: '',
          candleFingerprint: '',
          sessionKey: request.sessionKey,
        },
        error: compile.diagnostics[0]?.message ?? 'Compile failed',
        errorCode: 'compile',
      },
    };
  }

  const resolved = await resolveAlignedSecondarySeries({
    artifact: compile.artifact,
    manifest: compile.manifest,
    candles: request.candles,
    inputs: request.inputs,
    revision: compile.artifactHash,
    sessionKey: request.sessionKey,
    seriesContext: request.seriesContext!,
    resolver: request.seriesResolver!,
    budgets: request.budgets,
    signal: request.signal,
  });

  if (!resolved.ok) {
    const execution = await executeArtifactWithSecondarySeries({
      artifact: compile.artifact,
      manifest: compile.manifest,
      candles: request.candles,
      inputs: request.inputs,
      revision: compile.artifactHash,
      sessionKey: request.sessionKey,
      seriesContext: request.seriesContext,
      budgets: request.budgets,
      signal: request.signal,
    }).catch(() => null);

    return {
      compile,
      execution: execution ?? undefined,
      effective: {
        status: 'error',
        series: {},
        plots: compile.manifest.plots,
        fingerprints: {
          revision: compile.artifactHash,
          runtimeAbi: 'edge-indicator-runtime-1',
          sdkVersion: SCRIPT_SDK_VERSION,
          inputsFingerprint: '',
          candleFingerprint: '',
          sessionKey: request.sessionKey,
        },
        error: resolved.error,
        errorCode: resolved.errorCode,
      },
    };
  }

  const execution = await executeArtifactWithSecondarySeries({
    artifact: compile.artifact,
    manifest: compile.manifest,
    candles: request.candles,
    inputs: request.inputs,
    revision: compile.artifactHash,
    sessionKey: request.sessionKey,
    seriesContext: request.seriesContext,
    secondarySeries: resolved.value.secondarySeries,
    secondarySeriesFingerprint: resolved.value.fingerprint,
    budgets: request.budgets,
    signal: request.signal,
  });

  if (execution.errorCode === 'cancelled') {
    return {
      compile,
      execution,
      effective: execution,
    };
  }

  if (execution.status === 'ready') {
    return {
      compile,
      execution,
      lastValid: {
        artifact: compile.artifact,
        manifest: compile.manifest,
        artifactHash: compile.artifactHash,
        execution,
      },
      effective: execution,
    };
  }

  return {
    compile,
    execution,
    effective: execution,
  };
}

async function runScriptPipelineMainThread(
  request: ScriptPipelineRequest,
): Promise<ScriptSessionEvaluateResult> {
  const session = createScriptSession();
  return session.evaluate({
    source: request.source,
    candles: request.candles,
    inputs: request.inputs,
    sessionKey: request.sessionKey,
    requestId: request.requestId,
    budgets: request.budgets,
    signal: request.signal,
  });
}

function pipelineResponseToSessionResult(
  response: RuntimeWorkerResponse,
  sessionKey: string,
  signal?: AbortSignal,
): ScriptSessionEvaluateResult {
  if (signal?.aborted) {
    return {
      compile: response.compile,
      execution: response.execution,
      effective: response.execution,
    };
  }

  if (!response.compile.ok) {
    return {
      compile: response.compile,
      execution: response.execution,
      effective: response.execution ?? {
        status: 'error',
        series: {},
        plots: {},
        fingerprints: {
          revision: '',
          runtimeAbi: 'edge-indicator-runtime-1',
          sdkVersion: SCRIPT_SDK_VERSION,
          inputsFingerprint: '',
          candleFingerprint: '',
          sessionKey,
        },
        error: response.compile.diagnostics[0]?.message ?? 'Compile failed',
        errorCode: 'compile',
      },
    };
  }

  const execution = response.execution;
  if (!execution) {
    return { compile: response.compile, effective: undefined };
  }

  return {
    compile: response.compile,
    execution,
    lastValid:
      execution.status === 'ready'
        ? {
            artifact: response.compile.artifact!,
            manifest: response.compile.manifest!,
            artifactHash: response.compile.artifactHash!,
            execution,
          }
        : undefined,
    effective: execution,
  };
}

export function resetScriptRuntimeWorkerForTests(): void {
  terminateWorker();
  workerFailed = false;
  workerCrashCount = 0;
  workerDegraded = false;
}
