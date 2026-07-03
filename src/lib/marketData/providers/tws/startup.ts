import "server-only";

import { isTwsConfigured } from "./client";
import { killManagedSidecar, recoverTwsSidecar } from "./recover";

let ensurePromise: Promise<void> | null = null;

export function ensureSidecarOnServerBoot(): Promise<void> {
  if (!isTwsConfigured()) return Promise.resolve();
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      // Boot-time ensure: spawn if unreachable, restart if wedged/stuck,
      // call /control/reconnect to prime IB Gateway, reset gate on success.
      await recoverTwsSidecar([], { warmup: async () => {} });
    } catch {
      // Best-effort; first chart request will retry via normal routing.
    }
  })();
  return ensurePromise;
}

export function awaitSidecarStartup(): Promise<void> {
  return ensurePromise ?? Promise.resolve();
}

export function resetSidecarStartupForTests(): void {
  ensurePromise = null;
}

export { killManagedSidecar };
