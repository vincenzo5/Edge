import { z } from "zod";

export const JOURNAL_SETUP_VALUES_STORAGE_KEY = "edge.journal.setupValues.v1";

export const JOURNAL_SETUP_VALUE_MAX_LENGTH = 40;
export const JOURNAL_SETUP_VALUES_MAX_COUNT = 50;

export const DEFAULT_JOURNAL_SETUP_VALUES = [
  "breakout",
  "pullback",
  "earnings",
  "spread",
  "other",
] as const;

export type DefaultJournalSetupValue = (typeof DEFAULT_JOURNAL_SETUP_VALUES)[number];

const JOURNAL_SETUP_VALUE_EVENT = "edge:journalSetupValues";

export const journalSetupValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(JOURNAL_SETUP_VALUE_MAX_LENGTH);

export const journalSetupValuesSchema = z
  .array(journalSetupValueSchema)
  .min(1)
  .max(JOURNAL_SETUP_VALUES_MAX_COUNT);

export type JournalSetupValues = z.infer<typeof journalSetupValuesSchema>;

export function normalizeJournalSetupValues(values: readonly string[]): JournalSetupValues {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > JOURNAL_SETUP_VALUE_MAX_LENGTH) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
    if (normalized.length >= JOURNAL_SETUP_VALUES_MAX_COUNT) break;
  }

  if (normalized.length === 0) {
    return [...DEFAULT_JOURNAL_SETUP_VALUES];
  }

  return journalSetupValuesSchema.parse(normalized);
}

export function readJournalSetupValues(): JournalSetupValues {
  if (typeof window === "undefined") {
    return [...DEFAULT_JOURNAL_SETUP_VALUES];
  }
  try {
    const raw = window.localStorage.getItem(JOURNAL_SETUP_VALUES_STORAGE_KEY);
    if (!raw) return [...DEFAULT_JOURNAL_SETUP_VALUES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_JOURNAL_SETUP_VALUES];
    return normalizeJournalSetupValues(parsed);
  } catch {
    return [...DEFAULT_JOURNAL_SETUP_VALUES];
  }
}

function dispatchJournalSetupValuesChanged(values: JournalSetupValues): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<JournalSetupValues>(JOURNAL_SETUP_VALUE_EVENT, { detail: values }),
  );
}

export function writeJournalSetupValues(values: JournalSetupValues): JournalSetupValues {
  const normalized = normalizeJournalSetupValues(values);
  if (typeof window === "undefined") return normalized;
  window.localStorage.setItem(JOURNAL_SETUP_VALUES_STORAGE_KEY, JSON.stringify(normalized));
  dispatchJournalSetupValuesChanged(normalized);
  void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
    notifyUserPreferencesChanged(),
  );
  return normalized;
}

export function subscribeJournalSetupValues(
  listener: (values: JournalSetupValues) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<JournalSetupValues>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(JOURNAL_SETUP_VALUE_EVENT, handler);
  return () => window.removeEventListener(JOURNAL_SETUP_VALUE_EVENT, handler);
}

export function resetJournalSetupValues(): JournalSetupValues {
  return writeJournalSetupValues([...DEFAULT_JOURNAL_SETUP_VALUES]);
}

export function addJournalSetupValue(label: string): JournalSetupValues {
  const next = normalizeJournalSetupValues([...readJournalSetupValues(), label]);
  return writeJournalSetupValues(next);
}

export function renameJournalSetupValue(from: string, to: string): JournalSetupValues {
  const trimmedTo = to.trim();
  if (!trimmedTo) return readJournalSetupValues();
  const current = readJournalSetupValues();
  const index = current.indexOf(from);
  if (index < 0) return current;
  const withoutFrom = current.filter((value) => value !== from);
  const withoutDuplicate = withoutFrom.filter((value) => value !== trimmedTo);
  const next = [...withoutDuplicate.slice(0, index), trimmedTo, ...withoutDuplicate.slice(index)];
  return writeJournalSetupValues(next);
}

export function removeJournalSetupValue(label: string): JournalSetupValues {
  const current = readJournalSetupValues();
  const next = current.filter((value) => value !== label);
  if (next.length === 0) return readJournalSetupValues();
  return writeJournalSetupValues(next);
}

export function reorderJournalSetupValues(fromIndex: number, toIndex: number): JournalSetupValues {
  const current = [...readJournalSetupValues()];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }
  const [moved] = current.splice(fromIndex, 1);
  current.splice(toIndex, 0, moved!);
  return writeJournalSetupValues(current);
}

export function journalSetupSelectOptions(
  catalog: readonly string[],
  currentValue?: string | null,
): { value: string; label: string }[] {
  const values = [...catalog];
  const trimmedCurrent = currentValue?.trim();
  if (trimmedCurrent && !values.includes(trimmedCurrent)) {
    values.unshift(trimmedCurrent);
  }
  return values.map((value) => ({ value, label: value }));
}
