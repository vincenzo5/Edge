export type HealthEventKind =
  | "transport_fallback"
  | "provider_skip"
  | "stream_error"
  | "recovery";

export type HealthEvent = {
  id: string;
  kind: HealthEventKind;
  message: string;
  at: number;
  recovered?: boolean;
  dataset?: string;
};

export type RecordHealthEventInput = {
  kind: HealthEventKind;
  message: string;
  recovered?: boolean;
  dataset?: string;
  at?: number;
};

const MAX_EVENTS = 8;
const DEDUPE_WINDOW_MS = 30_000;

let eventSeq = 0;
let sessionEvents: HealthEvent[] = [];
const listeners = new Set<(events: HealthEvent[]) => void>();

function notify(): void {
  const snapshot = [...sessionEvents];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/** Session-scoped health event ring buffer (diagnostic only — never drives severity). */
export function recordHealthEvent(input: RecordHealthEventInput): HealthEvent {
  const at = input.at ?? Date.now();
  const dedupeKey = `${input.kind}:${input.message}:${input.dataset ?? ""}`;
  const existing = sessionEvents.find(
    (event) =>
      `${event.kind}:${event.message}:${event.dataset ?? ""}` === dedupeKey &&
      at - event.at < DEDUPE_WINDOW_MS,
  );
  if (existing) {
    if (input.recovered && !existing.recovered) {
      existing.recovered = true;
      notify();
    }
    return existing;
  }

  const event: HealthEvent = {
    id: `health-event-${++eventSeq}`,
    kind: input.kind,
    message: input.message.trim(),
    at,
    recovered: input.recovered,
    dataset: input.dataset,
  };
  sessionEvents = [event, ...sessionEvents].slice(0, MAX_EVENTS);
  notify();
  return event;
}

export function getHealthEvents(): HealthEvent[] {
  return [...sessionEvents];
}

export function subscribeHealthEvents(listener: (events: HealthEvent[]) => void): () => void {
  listeners.add(listener);
  listener(getHealthEvents());
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — clears session events between tests. */
export function resetHealthEventsForTests(): void {
  sessionEvents = [];
  eventSeq = 0;
  notify();
}
