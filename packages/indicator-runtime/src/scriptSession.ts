import type { Candle } from '@edge/chart-core';
import type {
  ScriptCompileResult,
  ScriptExecutionResult,
  ScriptManifest,
  ScriptRuntimeBudgets,
} from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS, SCRIPT_SDK_VERSION } from '@edge/chart-core';
import { compileScript } from './compileScript.js';
import { executeArtifact } from './executeArtifact.js';

export type LastValidScriptState = {
  artifact: string;
  manifest: ScriptManifest;
  artifactHash: string;
  execution: ScriptExecutionResult;
};

export type ScriptSessionEvaluateRequest = {
  source: string;
  candles: Candle[];
  inputs: Record<string, unknown>;
  sessionKey: string;
  requestId?: string;
  budgets?: ScriptRuntimeBudgets;
  signal?: AbortSignal;
};

export type ScriptSessionEvaluateResult = {
  compile: ScriptCompileResult;
  execution?: ScriptExecutionResult;
  lastValid?: LastValidScriptState;
  /** Effective result for consumers — ready, stale (last-valid preserved), or error without prior success. */
  effective?: ScriptExecutionResult;
};

export class ScriptSession {
  private lastValid: LastValidScriptState | undefined;

  getLastValid(): LastValidScriptState | undefined {
    return this.lastValid;
  }

  clearLastValid(): void {
    this.lastValid = undefined;
  }

  async evaluate(request: ScriptSessionEvaluateRequest): Promise<ScriptSessionEvaluateResult> {
    const budgets = request.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS;
    const compile = compileScript(request.source, budgets);

    if (request.signal?.aborted) {
      return {
        compile,
        lastValid: this.lastValid,
        effective: this.buildCancelledEffective(request.sessionKey),
      };
    }

    if (!compile.ok || !compile.artifact || !compile.manifest || !compile.artifactHash) {
      return {
        compile,
        lastValid: this.lastValid,
        effective: this.lastValid
          ? this.buildStaleEffective(this.lastValid.execution, compile.diagnostics[0]?.message ?? 'Compile failed')
          : this.buildErrorEffective(request.sessionKey, compile.diagnostics[0]?.message ?? 'Compile failed', 'compile'),
      };
    }

    const execution = await executeArtifact({
      artifact: compile.artifact,
      manifest: compile.manifest,
      candles: request.candles,
      inputs: request.inputs,
      revision: compile.artifactHash,
      sessionKey: request.sessionKey,
      requestId: request.requestId,
      budgets,
      signal: request.signal,
    });

    if (execution.errorCode === 'cancelled') {
      return {
        compile,
        execution,
        lastValid: this.lastValid,
        effective: this.lastValid?.execution ?? execution,
      };
    }

    if (execution.status === 'ready') {
      this.lastValid = {
        artifact: compile.artifact,
        manifest: compile.manifest,
        artifactHash: compile.artifactHash,
        execution,
      };
      return {
        compile,
        execution,
        lastValid: this.lastValid,
        effective: execution,
      };
    }

    return {
      compile,
      execution,
      lastValid: this.lastValid,
      effective: this.lastValid
        ? this.buildStaleEffective(this.lastValid.execution, execution.error ?? 'Execution failed')
        : execution,
    };
  }

  private buildStaleEffective(
    lastExecution: ScriptExecutionResult,
    errorMessage: string,
  ): ScriptExecutionResult {
    return {
      ...lastExecution,
      status: 'stale',
      error: errorMessage,
      errorCode: lastExecution.errorCode ?? 'runtime',
    };
  }

  private buildErrorEffective(
    sessionKey: string,
    error: string,
    errorCode: ScriptExecutionResult['errorCode'],
  ): ScriptExecutionResult {
    return {
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
      error,
      errorCode,
    };
  }

  private buildCancelledEffective(sessionKey: string): ScriptExecutionResult {
    return {
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
      error: 'Execution cancelled',
      errorCode: 'cancelled',
    };
  }
}

export function createScriptSession(): ScriptSession {
  return new ScriptSession();
}

export function rejectStalePipelineResponse(
  responseSessionKey: string,
  expectedSessionKey: string,
): boolean {
  return responseSessionKey !== expectedSessionKey;
}
