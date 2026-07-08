"use client";

import { useState } from "react";
import { EdgeButton } from "@/app/components/design-system";
import JournalFilterDrawer from "@/app/components/journal/JournalFilterDrawer";
import {
  buildJournalFilterChips,
  countActiveJournalFilters,
  defaultJournalScopeState,
  defaultTradesScopeState,
  isCustomDateRange,
  PERIOD_PRESETS,
  type JournalFilterHelpersMode,
} from "@/lib/journal/journalFilterHelpers";
import { EMPTY_JOURNAL_FILTERS, type JournalFilters, type JournalStatsWindow } from "@/lib/journal/journalStats";

type Props = {
  mode: JournalFilterHelpersMode;
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
  window: JournalStatsWindow;
  onWindowChange: (window: JournalStatsWindow) => void;
};

const PERIOD_SELECT_OPTIONS: { value: JournalStatsWindow | "custom"; label: string }[] = [
  ...PERIOD_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
  { value: "custom", label: "Custom range…" },
];

export default function JournalScopeBar({
  mode,
  filters,
  onChange,
  window,
  onWindowChange,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = countActiveJournalFilters(filters, { mode });
  const chips = buildJournalFilterChips(filters, { mode });
  const periodValue = isCustomDateRange(filters) ? "custom" : window;

  function handlePeriodChange(value: string) {
    if (value === "custom") {
      setDrawerOpen(true);
      return;
    }
    onWindowChange(value as JournalStatsWindow);
    if (isCustomDateRange(filters)) {
      onChange({ ...filters, closedFrom: undefined, closedTo: undefined });
    }
  }

  function handleClearAll() {
    const defaults = mode === "dashboard" ? defaultJournalScopeState() : defaultTradesScopeState();
    onChange(defaults.filters);
    onWindowChange(defaults.window);
  }

  function handleApplyDrawer(next: JournalFilters) {
    onChange(next);
  }

  function handleRemoveChip(clearPatch: Partial<JournalFilters>) {
    onChange({ ...filters, ...clearPatch });
  }

  const defaultWindow = (mode === "dashboard" ? defaultJournalScopeState() : defaultTradesScopeState()).window;
  const showClearAll =
    activeCount > 0 ||
    isCustomDateRange(filters) ||
    filters.symbol?.trim() ||
    window !== defaultWindow;

  return (
    <>
      <section data-testid="journal-scope-bar" className="flex min-w-0 flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PeriodSelect value={periodValue} onChange={handlePeriodChange} />
          <SymbolSearch
            value={filters.symbol ?? ""}
            onChange={(symbol) => onChange({ ...filters, symbol: symbol || undefined })}
          />
          <EdgeButton
            variant="chrome"
            data-testid="journal-filter-drawer-trigger"
            onClick={() => setDrawerOpen(true)}
          >
            {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
          </EdgeButton>
          {showClearAll ? (
            <button
              type="button"
              data-testid="journal-scope-clear-all"
              className="text-xs text-[var(--edge-accent-blue)] hover:underline"
              onClick={handleClearAll}
            >
              Clear all
            </button>
          ) : null}
        </div>
        {chips.length > 0 ? (
          <div
            data-testid="journal-active-filter-chips"
            className="flex flex-wrap items-center justify-end gap-1.5"
          >
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                data-testid={`journal-filter-chip-${chip.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-[10px] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
                onClick={() => handleRemoveChip(chip.clearPatch)}
              >
                <span>{chip.label}</span>
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <JournalFilterDrawer
        open={drawerOpen}
        mode={mode}
        filters={filters}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyDrawer}
      />
    </>
  );
}

function PeriodSelect({
  value,
  onChange,
}: {
  value: JournalStatsWindow | "custom";
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-[var(--edge-text-secondary)]">
      <span>Period</span>
      <select
        data-testid="journal-period-select"
        className="rounded border border-[var(--edge-border)] bg-transparent px-2 py-1 text-xs text-[var(--edge-text-primary)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {PERIOD_SELECT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SymbolSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-[var(--edge-text-secondary)]">
      <span aria-hidden>🔍</span>
      <input
        data-testid="journal-filter-symbol"
        type="text"
        placeholder="Search symbol…"
        className="w-28 rounded border border-[var(--edge-border)] bg-transparent px-2 py-1 text-xs text-[var(--edge-text-primary)] sm:w-36"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </label>
  );
}