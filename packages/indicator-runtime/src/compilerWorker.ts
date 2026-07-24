import type { ScriptCompileResult } from '@edge/chart-core';
import type { ScriptRuntimeBudgets } from '@edge/chart-core';
import { compileScriptService } from './compilerService.js';

export type CompilerWorkerRequest = {
  type: 'compile';
  requestId: string;
  source: string;
  budgets: ScriptRuntimeBudgets;
};

export type CompilerWorkerCancelRequest = {
  type: 'cancel';
  requestId: string;
};

export type CompilerWorkerResponse = {
  type: 'compile-result';
  requestId: string;
  result: ScriptCompileResult;
};

const cancelledRequests = new Set<string>();

export function markCompilerRequestCancelled(requestId: string): void {
  cancelledRequests.add(requestId);
}

export function handleCompilerWorkerMessage(
  data: CompilerWorkerRequest,
): CompilerWorkerResponse {
  if (cancelledRequests.has(data.requestId)) {
    cancelledRequests.delete(data.requestId);
    return {
      type: 'compile-result',
      requestId: data.requestId,
      result: {
        ok: false,
        diagnostics: [{ line: 1, column: 1, message: 'Compile cancelled', severity: 'error' }],
      },
    };
  }
  const result = compileScriptService({ source: data.source, budgets: data.budgets });
  return { type: 'compile-result', requestId: data.requestId, result };
}

/** Worker entry — import this file from a dedicated Web Worker bundle. */
if (typeof self !== 'undefined' && 'postMessage' in self) {
  self.onmessage = (event: MessageEvent<CompilerWorkerRequest | CompilerWorkerCancelRequest>) => {
    if (event.data.type === 'cancel') {
      markCompilerRequestCancelled(event.data.requestId);
      return;
    }
    const response = handleCompilerWorkerMessage(event.data);
    self.postMessage(response);
  };
}
