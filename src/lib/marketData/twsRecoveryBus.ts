export type TwsRecoveryPhase = "started" | "progress" | "completed" | "failed";

export type TwsRecoveryBusEvent = {
  phase: TwsRecoveryPhase;
  message?: string;
  source?: string;
  at: number;
};

type Listener = (event: TwsRecoveryBusEvent) => void;

const listeners = new Set<Listener>();

export function emitTwsRecovery(
  phase: TwsRecoveryPhase,
  options: { message?: string; source?: string } = {},
): void {
  const event: TwsRecoveryBusEvent = {
    phase,
    message: options.message,
    source: options.source,
    at: Date.now(),
  };
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeTwsRecovery(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper */
export function resetTwsRecoveryBusForTests(): void {
  listeners.clear();
}
