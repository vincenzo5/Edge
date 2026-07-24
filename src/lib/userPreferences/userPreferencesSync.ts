let generation = 0;
let applyingRemote = false;
const listeners = new Set<() => void>();

export function getUserPreferencesGeneration(): number {
  return generation;
}

export function subscribeUserPreferencesGeneration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyUserPreferencesChanged(): void {
  if (applyingRemote) return;
  generation += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function runApplyingRemoteUserPreferences<T>(fn: () => T): T {
  applyingRemote = true;
  try {
    return fn();
  } finally {
    applyingRemote = false;
  }
}

export function isApplyingRemoteUserPreferences(): boolean {
  return applyingRemote;
}

/** Test-only reset. */
export function resetUserPreferencesSyncStateForTests(): void {
  generation = 0;
  applyingRemote = false;
  listeners.clear();
}
