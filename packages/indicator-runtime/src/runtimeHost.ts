import type { QuickJSContext, QuickJSRuntime, QuickJSWASMModule } from 'quickjs-emscripten';
import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten';
import type { ScriptRuntimeBudgets } from '@edge/chart-core';
import { PROBED_GUEST_GLOBALS, type GuestCapabilityProbe } from './guestGlobals.js';
import { GUEST_LOCKDOWN_BOOTSTRAP } from './guestLockdown.js';

export type RuntimeHostHandle = {
  runtime: QuickJSRuntime;
  context: QuickJSContext;
  dispose: () => void;
};

let quickJsModule: QuickJSWASMModule | undefined;

export async function getQuickJsModule(): Promise<QuickJSWASMModule> {
  if (!quickJsModule) {
    quickJsModule = await getQuickJS();
  }
  return quickJsModule;
}

export async function createRuntimeHost(
  budgets: Pick<ScriptRuntimeBudgets, 'maxGuestMemoryBytes' | 'maxExecuteMs'>,
  signal?: AbortSignal,
): Promise<RuntimeHostHandle> {
  const QuickJS = await getQuickJsModule();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(budgets.maxGuestMemoryBytes);
  const deadline = Date.now() + budgets.maxExecuteMs;
  const deadlineHandler = shouldInterruptAfterDeadline(deadline);
  runtime.setInterruptHandler((rt) => {
    if (signal?.aborted) return true;
    return deadlineHandler(rt);
  });
  const context = runtime.newContext();
  return {
    runtime,
    context,
    dispose: () => {
      context.dispose();
      runtime.dispose();
    },
  };
}

export async function probeGuestCapabilities(): Promise<GuestCapabilityProbe> {
  const QuickJS = await getQuickJsModule();
  const runtime = QuickJS.newRuntime();
  const context = runtime.newContext();
  try {
    const lockdown = context.evalCode(GUEST_LOCKDOWN_BOOTSTRAP);
    if ('error' in lockdown && lockdown.error) {
      lockdown.error.dispose();
    } else if ('value' in lockdown && lockdown.value) {
      lockdown.value.dispose();
    }
    const probe: GuestCapabilityProbe = {};
    for (const name of PROBED_GUEST_GLOBALS) {
      const result = context.evalCode(`typeof ${name}`);
      if (result.error) {
        probe[name] = 'error';
      } else {
        probe[name] = context.dump(result.value);
        result.value.dispose();
      }
      result.error?.dispose();
    }
    return probe;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}

export async function recoverFromWorkerCrash(): Promise<{ recovered: true }> {
  quickJsModule = undefined;
  const QuickJS = await getQuickJsModule();
  const runtime = QuickJS.newRuntime();
  const context = runtime.newContext();
  const ok = context.evalCode('1 + 1');
  if (ok.error) {
    ok.error.dispose();
    throw new Error('Worker recovery failed');
  }
  ok.value.dispose();
  context.dispose();
  runtime.dispose();
  return { recovered: true };
}

export function isAbortError(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}
