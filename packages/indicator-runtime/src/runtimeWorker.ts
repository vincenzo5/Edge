import type { Candle } from '@edge/chart-core';
import {
  CANDLE_TRANSFER_ENCODING,
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_SDK_VERSION,
  unpackCandlesFromTransferBuffer,
  type CandleTransferEncoding,
} from '@edge/chart-core';
import { compileScriptService } from './compilerService.js';
import { executeArtifact } from './executeArtifact.js';
import { rejectStalePipelineResponse } from './scriptSession.js';
import type {
  ScriptCompileResult,
  ScriptExecutionResult,
  ScriptManifest,
  ScriptRuntimeBudgets,
} from '@edge/chart-core';

export type RuntimeWorkerCompileRequest = {
  type: 'compile-and-run';
  requestId: string;
  source: string;
  candles?: Candle[];
  candlesEncoding?: CandleTransferEncoding;
  candlesBuffer?: ArrayBuffer;
  candleCount?: number;
  inputs: Record<string, unknown>;
  revision: string;
  sessionKey: string;
  budgets?: ScriptRuntimeBudgets;
};

export type RuntimeWorkerCancelRequest = {
  type: 'cancel';
  requestId: string;
};

export type RuntimeWorkerResponse = {
  type: 'pipeline-result';
  requestId: string;
  sessionKey: string;
  compile: ScriptCompileResult;
  execution?: ScriptExecutionResult;
  stale?: boolean;
};

const cancelledRequests = new Set<string>();
const abortControllers = new Map<string, AbortController>();

export function markRuntimeRequestCancelled(requestId: string): void {
  cancelledRequests.add(requestId);
  abortControllers.get(requestId)?.abort();
}

export function resolveWorkerCandles(data: RuntimeWorkerCompileRequest): Candle[] {
  if (
    data.candlesEncoding === CANDLE_TRANSFER_ENCODING &&
    data.candlesBuffer &&
    data.candleCount != null
  ) {
    return unpackCandlesFromTransferBuffer(data.candlesBuffer, data.candleCount, data.candlesEncoding);
  }
  if (data.candles) {
    return data.candles;
  }
  throw new Error('Worker compile request missing candle payload');
}

export async function runCompileAndExecutePipeline(
  source: string,
  candles: Candle[],
  inputs: Record<string, unknown>,
  revision: string,
  sessionKey: string,
  requestId: string,
  budgets: ScriptRuntimeBudgets = DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  signal?: AbortSignal,
): Promise<RuntimeWorkerResponse> {
  const compile = compileScriptService({ source, budgets });
  if (!compile.ok || !compile.artifact || !compile.manifest) {
    return { type: 'pipeline-result', requestId, sessionKey, compile };
  }

  const execution = await executeArtifact({
    artifact: compile.artifact,
    manifest: compile.manifest,
    candles,
    inputs,
    revision: compile.artifactHash ?? revision,
    sessionKey,
    requestId,
    expectedSessionKey: sessionKey,
    budgets,
    signal,
  });

  return { type: 'pipeline-result', requestId, sessionKey, compile, execution };
}

export async function handleRuntimeWorkerMessage(
  data: RuntimeWorkerCompileRequest,
): Promise<RuntimeWorkerResponse | { type: 'stale-rejected'; requestId: string }> {
  if (cancelledRequests.has(data.requestId)) {
    cancelledRequests.delete(data.requestId);
    abortControllers.delete(data.requestId);
    const compile: ScriptCompileResult = {
      ok: false,
      diagnostics: [{ line: 1, column: 1, message: 'Pipeline cancelled', severity: 'error' }],
    };
    return {
      type: 'pipeline-result',
      requestId: data.requestId,
      sessionKey: data.sessionKey,
      compile,
      execution: {
        status: 'error',
        series: {},
        plots: {},
        fingerprints: {
          revision: data.revision,
          runtimeAbi: 'edge-indicator-runtime-1',
          sdkVersion: SCRIPT_SDK_VERSION,
          inputsFingerprint: '',
          candleFingerprint: '',
          sessionKey: data.sessionKey,
        },
        error: 'Execution cancelled',
        errorCode: 'cancelled',
      },
    };
  }

  const controller = new AbortController();
  abortControllers.set(data.requestId, controller);

  try {
    const candles = resolveWorkerCandles(data);
    const response = await runCompileAndExecutePipeline(
      data.source,
      candles,
      data.inputs,
      data.revision,
      data.sessionKey,
      data.requestId,
      data.budgets,
      controller.signal,
    );

    if (rejectStalePipelineResponse(response.sessionKey, data.sessionKey)) {
      return { type: 'stale-rejected', requestId: data.requestId };
    }

    return response;
  } finally {
    abortControllers.delete(data.requestId);
  }
}

/** Worker entry — import this file from a dedicated Web Worker bundle. */
if (typeof self !== 'undefined' && 'postMessage' in self) {
  self.onmessage = async (event: MessageEvent<RuntimeWorkerCompileRequest | RuntimeWorkerCancelRequest>) => {
    if (event.data.type === 'cancel') {
      markRuntimeRequestCancelled(event.data.requestId);
      return;
    }
    const response = await handleRuntimeWorkerMessage(event.data);
    self.postMessage(response);
  };
}

export type { ScriptManifest };
