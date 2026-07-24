"use client";

import { useState } from "react";
import {
  CompactSearchFieldShell,
  EdgeButton,
  EdgeFilterChip,
  EdgeSelect,
  compactSearchFieldClass,
} from "@/app/components/design-system";
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

  const scopeDefaults = mode === "dashboard" ? defaultJournalScopeState() : defaultTradesScopeState();

  function handleApplyDrawer(next: JournalFilters) {
    onChange(next);
  }

  function handleRemoveChip(clearPatch: Partial<JournalFilters>) {
    onChange({ ...filters, ...clearPatch });
  }

  const defaultWindow = scopeDefaults.window;
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
            <EdgeButton
              type="button"
              variant="link"
              data-testid="journal-scope-clear-all"
              onClick={handleClearAll}
            >
              Clear all
            </EdgeButton>
          ) : null}
        </div>
        {chips.length > 0 ? (
          <div
            data-testid="journal-active-filter-chips"
            className="flex flex-wrap items-center justify-end gap-1.5"
          >
            {chips.map((chip) => (
              <EdgeFilterChip
                key={chip.id}
                label={chip.label}
                variant="dismissible"
                data-testid={`journal-filter-chip-${chip.id}`}
                onDismiss={() => handleRemoveChip(chip.clearPatch)}
              />
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
    <EdgeSelect
      testId="journal-period-select"
      variant="chip"
      label="Period"
      density="compact"
      value={value}
      onChange={onChange}
      sections={[
        {
          label: "Quick ranges",
          options: PERIOD_PRESETS.map((preset) => ({
            value: preset.id,
            label: preset.label,
          })),
        },
        {
          options: [
            {
              value: "custom",
              label: "Custom range…",
              description: "Pick dates",
            },
          ],
        },
      ]}
    />
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
    <CompactSearchFieldShell>
      <input
        data-testid="journal-filter-symbol"
        type="text"
        aria-label="Exact symbol filter"
        placeholder="Exact symbol"
        className={compactSearchFieldClass()}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </CompactSearchFieldShell>
  );
}