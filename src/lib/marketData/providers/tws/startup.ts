import "server-only";

import { isTwsConfigured } from "./client";
import { isTwsLocalManaged } from "./managedMode";
import { killManagedSidecar, recoverTwsSidecar } from "./recover";

let ensurePromise: Promise<void> | null = null;

const BROKERAGE_STARTUP_WAIT_MS = 15_000;

export function ensureSidecarOnServerBoot(): Promise<void> {
  if (!isTwsConfigured()) return Promise.resolve();
  if (!isTwsLocalManaged()) return Promise.resolve();
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

/** Bounded wait for brokerage routes — resolves on timeout without throwing. */
export async function awaitSidecarForBrokerage(
  timeoutMs = BROKERAGE_STARTUP_WAIT_MS,
): Promise<void> {
  if (!isTwsConfigured()) return;
  if (!isTwsLocalManaged()) return;

  const wait = ensurePromise ?? ensureSidecarOnServerBoot();
  await Promise.race([
    wait,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

export function resetSidecarStartupForTests(): void {
  ensurePromise = null;
}

export { killManagedSidecar };
