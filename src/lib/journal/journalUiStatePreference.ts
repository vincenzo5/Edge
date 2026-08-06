import { z } from "zod";
import {
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  type JournalTradesTableSort,
  type JournalTradesTableSortDirection,
  type JournalTradesTableSortKey,
} from "@/lib/journal/journalTradesTableControls";
import { defaultJournalScopeState } from "@/lib/journal/journalFilterHelpers";
import {
  EMPTY_JOURNAL_FILTERS,
  type ComparePresetId,
  type JournalFilters,
  type JournalStatsWindow,
} from "@/lib/journal/journalStats";

export const JOURNAL_UI_STATE_STORAGE_KEY = "edge.journal.uiState.v1";

export type JournalMetricUnit = "usd" | "pct" | "r";

export type JournalUiCalendarMonth = {
  year: number;
  month: number;
};

export type JournalUiState = {
  filters: JournalFilters;
  window: JournalStatsWindow;
  sort: JournalTradesTableSort;
  metricUnit: JournalMetricUnit;
  comparePreset: ComparePresetId;
  calendarMonth: JournalUiCalendarMonth;
};

const SORT_KEYS = [
  "openDate",
  "closeDate",
  "symbol",
  "status",
  "entry",
  "exit",
  "r",
  "netPnL",
  "activity",
] as const satisfies readonly JournalTradesTableSortKey[];

const SORT_DIRECTIONS = ["asc", "desc"] as const satisfies readonly JournalTradesTableSortDirection[];

const COMPARE_PRESETS = [
  "wins_vs_losses",
  "last30_vs_prior30",
  "high_vs_low_rating",
  "custom",
] as const satisfies readonly ComparePresetId[];

const METRIC_UNITS = ["usd", "pct", "r"] as const satisfies readonly JournalMetricUnit[];

const WINDOWS = ["today", "7d", "30d", "all"] as const satisfies readonly JournalStatsWindow[];

const journalFiltersSchema = z.object({
  status: z.enum(["all", "open", "closed"]).optional(),
  symbol: z.string().max(64).optional(),
  setup: z.union([z.literal("all"), z.string().min(1).max(40)]).optional(),
  tag: z.string().max(64).optional(),
  outcome: z.enum(["all", "win", "loss"]).optional(),
  closedFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  closedTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  closedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rating: z
    .union([z.literal("all"), z.literal("unrated"), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  includeIgnored: z.boolean().optional(),
});

const journalUiStateSchema = z.object({
  filters: journalFiltersSchema.optional(),
  window: z.enum(WINDOWS).optional(),
  sort: z
    .object({
      key: z.enum(SORT_KEYS),
      direction: z.enum(SORT_DIRECTIONS),
    })
    .optional(),
  metricUnit: z.enum(METRIC_UNITS).optional(),
  comparePreset: z.enum(COMPARE_PRESETS).optional(),
  calendarMonth: z
    .object({
      year: z.number().int().min(1970).max(2100),
      month: z.number().int().min(0).max(11),
    })
    .optional(),
});

function currentCalendarMonth(): JournalUiCalendarMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function normalizeFilters(filters: JournalFilters | undefined): JournalFilters {
  const defaults = EMPTY_JOURNAL_FILTERS;
  if (!filters) return { ...defaults };

  const symbol = filters.symbol?.trim();
  const tag = filters.tag?.trim();
  const setup = filters.setup;
  const normalizedSetup =
    setup == null || setup === "all" || String(setup).trim() === ""
      ? "all"
      : (String(setup).trim() as JournalFilters["setup"]);

  return {
    status: filters.status ?? defaults.status,
    symbol: symbol || undefined,
    setup: normalizedSetup,
    tag: tag || undefined,
    outcome: filters.outcome ?? defaults.outcome,
    closedFrom: filters.closedFrom?.trim() || undefined,
    closedTo: filters.closedTo?.trim() || undefined,
    // Day-summary selection is ephemeral — never restore closedDate from storage.
    closedDate: undefined,
    rating: filters.rating ?? defaults.rating,
    // List views force includeIgnored; do not persist it.
    includeIgnored: undefined,
  };
}

export function defaultJournalUiState(): JournalUiState {
  const scope = defaultJournalScopeState();
  return {
    filters: scope.filters,
    window: scope.window,
    sort: { ...DEFAULT_JOURNAL_TRADES_TABLE_SORT },
    metricUnit: "usd",
    comparePreset: "wins_vs_losses",
    calendarMonth: currentCalendarMonth(),
  };
}

export function normalizeJournalUiState(partial: Partial<JournalUiState> | null | undefined): JournalUiState {
  const defaults = defaultJournalUiState();
  if (!partial) return defaults;
  return {
    filters: normalizeFilters(partial.filters),
    window: partial.window ?? defaults.window,
    sort: partial.sort
      ? { key: partial.sort.key, direction: partial.sort.direction }
      : defaults.sort,
    metricUnit: partial.metricUnit ?? defaults.metricUnit,
    comparePreset: partial.comparePreset ?? defaults.comparePreset,
    calendarMonth: partial.calendarMonth ?? defaults.calendarMonth,
  };
}

export function readJournalUiState(): JournalUiState {
  const defaults = defaultJournalUiState();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(JOURNAL_UI_STATE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = journalUiStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return defaults;
    return normalizeJournalUiState(parsed.data);
  } catch {
    return defaults;
  }
}

export function writeJournalUiState(state: JournalUiState): JournalUiState {
  const normalized = normalizeJournalUiState(state);
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(JOURNAL_UI_STATE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore quota / private mode
  }
  return normalized;
}

/** Merge a patch onto the stored UI state (read-merge-write). */
export function patchJournalUiState(patch: Partial<JournalUiState>): JournalUiState {
  const next = normalizeJournalUiState({ ...readJournalUiState(), ...patch });
  return writeJournalUiState(next);
}

export function clearJournalUiScope(): JournalUiState {
  const defaults = defaultJournalScopeState();
  return patchJournalUiState({
    filters: defaults.filters,
    window: defaults.window,
  });
}
