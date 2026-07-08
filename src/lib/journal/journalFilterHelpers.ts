import type { JournalFilters, JournalStatsWindow } from "@/lib/journal/journalStats";
import { EMPTY_JOURNAL_FILTERS } from "@/lib/journal/journalStats";

export type JournalFilterHelpersMode = "dashboard" | "trades";

export type JournalFilterChip = {
  id: string;
  label: string;
  clearPatch: Partial<JournalFilters>;
};

export const PERIOD_PRESETS: { id: JournalStatsWindow; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All time" },
];

export function isCustomDateRange(filters: JournalFilters): boolean {
  return Boolean(filters.closedFrom?.trim() || filters.closedTo?.trim());
}

function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatJournalPeriodLabel(
  window: JournalStatsWindow,
  filters: JournalFilters,
): string {
  if (isCustomDateRange(filters)) {
    const from = filters.closedFrom?.trim();
    const to = filters.closedTo?.trim();
    if (from && to) return `${formatShortDate(from)} – ${formatShortDate(to)}`;
    if (from) return `From ${formatShortDate(from)}`;
    if (to) return `Through ${formatShortDate(to)}`;
  }
  return PERIOD_PRESETS.find((preset) => preset.id === window)?.label ?? window;
}

export function countActiveJournalFilters(
  filters: JournalFilters,
  options: { mode: JournalFilterHelpersMode },
): number {
  return buildJournalFilterChips(filters, options).length;
}

export function buildJournalFilterChips(
  filters: JournalFilters,
  options: { mode: JournalFilterHelpersMode },
): JournalFilterChip[] {
  const chips: JournalFilterChip[] = [];

  if (options.mode === "trades") {
    const status = filters.status ?? "all";
    if (status !== "all") {
      chips.push({
        id: "status",
        label: status === "open" ? "Open" : "Closed",
        clearPatch: { status: "all" },
      });
    }
  }

  const setup = filters.setup ?? "all";
  if (setup !== "all") {
    chips.push({
      id: "setup",
      label: setup,
      clearPatch: { setup: "all" },
    });
  }

  if (filters.tag?.trim()) {
    chips.push({
      id: "tag",
      label: filters.tag.trim(),
      clearPatch: { tag: undefined },
    });
  }

  const outcome = filters.outcome ?? "all";
  if (outcome !== "all") {
    chips.push({
      id: "outcome",
      label: outcome === "win" ? "Wins" : "Losses",
      clearPatch: { outcome: "all" },
    });
  }

  if (isCustomDateRange(filters)) {
    chips.push({
      id: "dateRange",
      label: formatJournalPeriodLabel("all", filters),
      clearPatch: { closedFrom: undefined, closedTo: undefined },
    });
  }

  return chips;
}

export function defaultJournalScopeState(): {
  filters: JournalFilters;
  window: JournalStatsWindow;
} {
  return {
    filters: { ...EMPTY_JOURNAL_FILTERS },
    window: "all",
  };
}

export function defaultTradesScopeState(): {
  filters: JournalFilters;
  window: JournalStatsWindow;
} {
  return {
    filters: { ...EMPTY_JOURNAL_FILTERS },
    window: "all",
  };
}
