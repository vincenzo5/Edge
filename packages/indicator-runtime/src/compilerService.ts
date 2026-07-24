import type { ScriptCompileResult, ScriptRuntimeBudgets } from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS } from '@edge/chart-core';
import { compileScript } from './compileScript.js';

export type CompileScriptServiceRequest = {
  source: string;
  budgets?: ScriptRuntimeBudgets;
};

/** Public Phase 1 compile façade for Phase 2 chart coordinator. */
export function compileScriptService(request: CompileScriptServiceRequest): ScriptCompileResult {
  return compileScript(request.source, request.budgets ?? DEFAULT_SCRIPT_RUNTIME_BUDGETS);
}
