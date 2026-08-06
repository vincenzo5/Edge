import { z } from "zod";

export const JOURNAL_CAPITAL_EVENTS_STORAGE_KEY = "edge.journal.capitalEvents.v1";

export const JOURNAL_CAPITAL_EVENTS_MAX_COUNT = 200;

const JOURNAL_CAPITAL_EVENTS_EVENT = "edge:journalCapitalEvents";

export const journalCapitalEventKindSchema = z.enum(["deposit", "withdrawal"]);
export const journalCapitalEventSourceSchema = z.enum(["statement_seed", "manual"]);

export const journalCapitalEventSchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountUsd: z.number().finite().positive(),
  kind: journalCapitalEventKindSchema,
  source: journalCapitalEventSourceSchema,
  note: z.string().max(200).optional(),
});

export const journalCapitalEventsSchema = z
  .array(journalCapitalEventSchema)
  .max(JOURNAL_CAPITAL_EVENTS_MAX_COUNT);

export type JournalCapitalEventKind = z.infer<typeof journalCapitalEventKindSchema>;
export type JournalCapitalEventSource = z.infer<typeof journalCapitalEventSourceSchema>;
export type JournalCapitalEvent = z.infer<typeof journalCapitalEventSchema>;
export type JournalCapitalEvents = z.infer<typeof journalCapitalEventsSchema>;

/** U25026894 YTD statement — Electronic Fund Transfer deposits (net $28,000). */
export const DEFAULT_JOURNAL_CAPITAL_EVENTS: JournalCapitalEvents = [
  {
    id: "seed-2026-03-27-500-a",
    date: "2026-03-27",
    amountUsd: 500,
    kind: "deposit",
    source: "statement_seed",
    note: "Electronic Fund Transfer Deposit",
  },
  {
    id: "seed-2026-03-27-500-b",
    date: "2026-03-27",
    amountUsd: 500,
    kind: "deposit",
    source: "statement_seed",
    note: "Electronic Fund Transfer Deposit",
  },
  {
    id: "seed-2026-05-18-15000",
    date: "2026-05-18",
    amountUsd: 15_000,
    kind: "deposit",
    source: "statement_seed",
    note: "Electronic Fund Transfer Deposit",
  },
  {
    id: "seed-2026-05-30-1000",
    date: "2026-05-30",
    amountUsd: 1_000,
    kind: "deposit",
    source: "statement_seed",
    note: "Electronic Fund Transfer Deposit",
  },
  {
    id: "seed-2026-06-04-11000",
    date: "2026-06-04",
    amountUsd: 11_000,
    kind: "deposit",
    source: "statement_seed",
    note: "Electronic Fund Transfer Deposit",
  },
];

export function signedJournalCapitalAmount(event: JournalCapitalEvent): number {
  return event.kind === "withdrawal" ? -event.amountUsd : event.amountUsd;
}

export function sumJournalNetDeposits(events: readonly JournalCapitalEvent[]): number | null {
  if (events.length === 0) return null;
  let total = 0;
  for (const event of events) {
    total += signedJournalCapitalAmount(event);
  }
  return total > 0 ? total : null;
}

export function normalizeJournalCapitalEvents(
  events: readonly JournalCapitalEvent[],
): JournalCapitalEvents {
  const seen = new Set<string>();
  const normalized: JournalCapitalEvent[] = [];

  for (const raw of events) {
    const parsed = journalCapitalEventSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    normalized.push(parsed.data);
    if (normalized.length >= JOURNAL_CAPITAL_EVENTS_MAX_COUNT) break;
  }

  normalized.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return journalCapitalEventsSchema.parse(normalized);
}

export function readJournalCapitalEvents(): JournalCapitalEvents {
  if (typeof window === "undefined") {
    return normalizeJournalCapitalEvents(DEFAULT_JOURNAL_CAPITAL_EVENTS);
  }
  try {
    const raw = window.localStorage.getItem(JOURNAL_CAPITAL_EVENTS_STORAGE_KEY);
    if (!raw) return normalizeJournalCapitalEvents(DEFAULT_JOURNAL_CAPITAL_EVENTS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeJournalCapitalEvents(DEFAULT_JOURNAL_CAPITAL_EVENTS);
    const normalized = normalizeJournalCapitalEvents(parsed);
    return normalized.length > 0
      ? normalized
      : normalizeJournalCapitalEvents(DEFAULT_JOURNAL_CAPITAL_EVENTS);
  } catch {
    return normalizeJournalCapitalEvents(DEFAULT_JOURNAL_CAPITAL_EVENTS);
  }
}

function dispatchJournalCapitalEventsChanged(events: JournalCapitalEvents): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<JournalCapitalEvents>(JOURNAL_CAPITAL_EVENTS_EVENT, { detail: events }),
  );
}

export function writeJournalCapitalEvents(events: JournalCapitalEvents): JournalCapitalEvents {
  const normalized = normalizeJournalCapitalEvents(events);
  if (typeof window === "undefined") return normalized;
  window.localStorage.setItem(JOURNAL_CAPITAL_EVENTS_STORAGE_KEY, JSON.stringify(normalized));
  dispatchJournalCapitalEventsChanged(normalized);
  void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
    notifyUserPreferencesChanged(),
  );
  return normalized;
}

export function subscribeJournalCapitalEvents(
  listener: (events: JournalCapitalEvents) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<JournalCapitalEvents>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(JOURNAL_CAPITAL_EVENTS_EVENT, handler);
  return () => window.removeEventListener(JOURNAL_CAPITAL_EVENTS_EVENT, handler);
}

export function resetJournalCapitalEvents(): JournalCapitalEvents {
  return writeJournalCapitalEvents([...DEFAULT_JOURNAL_CAPITAL_EVENTS]);
}

export function createJournalCapitalEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addJournalCapitalEvent(input: {
  date: string;
  amountUsd: number;
  kind?: JournalCapitalEventKind;
  note?: string;
}): JournalCapitalEvents {
  const event: JournalCapitalEvent = {
    id: createJournalCapitalEventId(),
    date: input.date,
    amountUsd: input.amountUsd,
    kind: input.kind ?? "deposit",
    source: "manual",
    note: input.note?.trim() || undefined,
  };
  return writeJournalCapitalEvents([...readJournalCapitalEvents(), event]);
}

export function removeJournalCapitalEvent(id: string): JournalCapitalEvents {
  const next = readJournalCapitalEvents().filter((event) => event.id !== id);
  return writeJournalCapitalEvents(next);
}
