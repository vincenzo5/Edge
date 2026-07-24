"use client";

import { useCallback, useEffect, useState } from "react";
import { EdgeEmptyState, EdgeSpinner } from "@/app/components/design-system";
import { useAppActions } from "@/app/components/AppActionsContext";
import { rangeForManualInterval } from "@edge/chart-react/engine/rangeInterval";
import { fetchDayProfiles } from "@/lib/dayProfiles/client";
import {
  EMPTY_DAY_PROFILES_UI_FILTERS,
  uiFiltersToQuery,
  type DayProfilesUiFilters,
} from "@/lib/dayProfiles/labels";
import { rthOpenMsForDate } from "@/lib/dayProfiles/rthOpen";
import type { DayProfile } from "@/lib/dayProfiles/types";
import { usePatternLibrary } from "../pattern-library/PatternLibraryContext";
import { PanelPopOutButton } from "../sidebar/PanelChromeActions";
import DayProfileCard from "./DayProfileCard";
import DayProfilesFilterBar from "./DayProfilesFilterBar";

export function DayProfilesPanel() {
  const appActions = useAppActions();
  const { requestChartGoto } = usePatternLibrary();
  const [filters, setFilters] = useState<DayProfilesUiFilters>(EMPTY_DAY_PROFILES_UI_FILTERS);
  const [profiles, setProfiles] = useState<DayProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const loadProfiles = useCallback(async (nextFilters: DayProfilesUiFilters) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDayProfiles(uiFiltersToQuery(nextFilters));
      setProfiles(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load day profiles");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles(filters);
  }, [filters, loadProfiles]);

  const handleOpenProfile = useCallback(
    (profile: DayProfile) => {
      const key = `${profile.symbol}:${profile.date}`;
      setSelectedKey(key);

      appActions?.patchActiveCell({
        symbol: profile.symbol,
        interval: "5m",
        range: rangeForManualInterval("5m"),
        rangePreset: null,
      });
      requestChartGoto({
        symbol: profile.symbol,
        atMs: rthOpenMsForDate(profile.date),
      });
    },
    [appActions, requestChartGoto],
  );

  return (
    <div
      data-testid="day-profiles-panel"
      className="flex h-full min-h-0 flex-col bg-[var(--edge-surface-panel)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
        <div>
          <div className="text-sm font-medium text-[var(--edge-text-primary)]">Days</div>
          <div className="text-xs text-[var(--edge-text-muted)]">
            Labeled session cohorts
          </div>
        </div>
        <PanelPopOutButton />
      </div>

      <div className="border-b border-[var(--edge-border)] px-3 py-2">
        <DayProfilesFilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--edge-text-muted)]">
            <EdgeSpinner size="sm" />
            Loading sessions…
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 text-sm text-[var(--edge-negative)]">{error}</div>
        ) : null}

        {!loading && !error && profiles.length === 0 ? (
          <EdgeEmptyState message="No confirmed sessions match these filters." />
        ) : null}

        {!loading && !error && profiles.length > 0 ? (
          <div
            data-testid="day-profiles-result-count"
            className="mb-2 text-xs text-[var(--edge-text-muted)]"
          >
            {profiles.length} session{profiles.length === 1 ? "" : "s"}
          </div>
        ) : null}

        <div className="grid gap-2">
          {profiles.map((profile) => {
            const key = `${profile.symbol}:${profile.date}`;
            return (
              <DayProfileCard
                key={key}
                profile={profile}
                selected={selectedKey === key}
                onSelect={() => handleOpenProfile(profile)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
