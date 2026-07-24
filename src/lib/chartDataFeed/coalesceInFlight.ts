const inFlight = new Map<string, Promise<unknown>>();

/**
 * Share one in-flight promise per key. Cleared when the promise settles.
 */
export function coalesceInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fn().finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, promise);
  return promise;
}

/** Test-only reset. */
export function resetCoalesceInFlightForTests(): void {
  inFlight.clear();
}
