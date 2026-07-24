"use client";

import {
  CompactSearchFieldShell,
  EdgeButton,
  EdgeFilterChip,
  EdgeSelect,
  compactSearchFieldClass,
} from "@/app/components/design-system";
import {
  buildDayProfileFilterChips,
  countActiveDayProfileFilters,
  DAY_TYPE_FILTER_OPTIONS,
  EMPTY_DAY_PROFILES_UI_FILTERS,
  GAP_FILTER_OPTIONS,
  OPEN_TYPE_FILTER_OPTIONS,
  PARTICIPATION_FILTER_OPTIONS,
  RELATIVE_FILTER_OPTIONS,
  VOLATILITY_FILTER_OPTIONS,
  type DayProfilesUiFilters,
} from "@/lib/dayProfiles/labels";

type Props = {
  filters: DayProfilesUiFilters;
  onChange: (filters: DayProfilesUiFilters) => void;
};

const ANY = "any";

function withAnyOption<T extends string>(
  options: Array<{ value: T; label: string }>,
): Array<{ value: string; label: string }> {
  return [{ value: ANY, label: "Any" }, ...options];
}

function readFilterValue(value: string): string {
  return value === ANY ? "" : value;
}

function writeFilterValue(value: string): string {
  return value || ANY;
}

export default function DayProfilesFilterBar({ filters, onChange }: Props) {
  const activeCount = countActiveDayProfileFilters(filters);
  const chips = buildDayProfileFilterChips(filters);

  function patch(partial: Partial<DayProfilesUiFilters>) {
    onChange({ ...filters, ...partial });
  }

  function handleClearAll() {
    onChange(EMPTY_DAY_PROFILES_UI_FILTERS);
  }

  return (
    <section data-testid="day-profiles-filter-bar" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <CompactSearchFieldShell>
          <input
            data-testid="day-profiles-filter-symbol"
            type="text"
            aria-label="Symbol filter"
            placeholder="Symbol"
            className={compactSearchFieldClass()}
            value={filters.symbol}
            onChange={(event) => patch({ symbol: event.target.value.toUpperCase() })}
          />
        </CompactSearchFieldShell>
        <FilterSelect
          testId="day-profiles-filter-day-type"
          label="Day type"
          value={writeFilterValue(filters.dayType)}
          options={withAnyOption(DAY_TYPE_FILTER_OPTIONS)}
          onChange={(value) => patch({ dayType: readFilterValue(value) })}
        />
        <FilterSelect
          testId="day-profiles-filter-open-type"
          label="Open"
          value={writeFilterValue(filters.openType)}
          options={withAnyOption(OPEN_TYPE_FILTER_OPTIONS)}
          onChange={(value) => patch({ openType: readFilterValue(value) })}
        />
        <FilterSelect
          testId="day-profiles-filter-gap"
          label="Gap"
          value={writeFilterValue(filters.gap)}
          options={withAnyOption(GAP_FILTER_OPTIONS)}
          onChange={(value) => patch({ gap: readFilterValue(value) })}
        />
        <FilterSelect
          testId="day-profiles-filter-volatility"
          label="Vol"
          value={writeFilterValue(filters.volatility)}
          options={withAnyOption(VOLATILITY_FILTER_OPTIONS)}
          onChange={(value) => patch({ volatility: readFilterValue(value) })}
        />
        <FilterSelect
          testId="day-profiles-filter-participation"
          label="RVOL"
          value={writeFilterValue(filters.participation)}
          options={withAnyOption(PARTICIPATION_FILTER_OPTIONS)}
          onChange={(value) => patch({ participation: readFilterValue(value) })}
        />
        <FilterSelect
          testId="day-profiles-filter-relative"
          label="Relative"
          value={writeFilterValue(filters.relative)}
          options={withAnyOption(RELATIVE_FILTER_OPTIONS)}
          onChange={(value) => patch({ relative: readFilterValue(value) })}
        />
        {activeCount > 0 ? (
          <EdgeButton type="button" variant="link" data-testid="day-profiles-clear-all" onClick={handleClearAll}>
            Clear all
          </EdgeButton>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div
          data-testid="day-profiles-active-filter-chips"
          className="flex flex-wrap items-center gap-1.5"
        >
          {chips.map((chip) => (
            <EdgeFilterChip
              key={chip.id}
              label={chip.label}
              variant="dismissible"
              data-testid={`day-profiles-filter-chip-${chip.id}`}
              onDismiss={() => patch({ [chip.clearKey]: "" })}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FilterSelect({
  testId,
  label,
  value,
  options,
  onChange,
}: {
  testId: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <EdgeSelect
      testId={testId}
      variant="chip"
      label={label}
      density="compact"
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
