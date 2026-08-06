"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  defaultJournalUiState,
  patchJournalUiState,
  readJournalUiState,
  type JournalUiState,
} from "@/lib/journal/journalUiStatePreference";

type ScopeSlice = Pick<JournalUiState, "filters" | "window">;
type SortSlice = Pick<JournalUiState, "sort">;
type CalendarSlice = Pick<JournalUiState, "calendarMonth">;

/**
 * Hydrate journal UI state from localStorage after mount (SSR-safe),
 * then persist patches when values change.
 */
export function usePersistedJournalScope(): {
  filters: JournalUiState["filters"];
  setFilters: Dispatch<SetStateAction<JournalUiState["filters"]>>;
  window: JournalUiState["window"];
  setWindow: Dispatch<SetStateAction<JournalUiState["window"]>>;
  hydrated: boolean;
} {
  const defaults = defaultJournalUiState();
  const [filters, setFilters] = useState(defaults.filters);
  const [window, setWindow] = useState(defaults.window);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = readJournalUiState();
    setFilters(state.filters);
    setWindow(state.window);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const patch: ScopeSlice = { filters, window };
    patchJournalUiState(patch);
  }, [hydrated, filters, window]);

  return { filters, setFilters, window, setWindow, hydrated };
}

export function usePersistedJournalSort(): {
  sort: JournalUiState["sort"];
  setSort: Dispatch<SetStateAction<JournalUiState["sort"]>>;
  hydrated: boolean;
} {
  const [sort, setSort] = useState(() => defaultJournalUiState().sort);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = readJournalUiState();
    setSort(state.sort);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const patch: SortSlice = { sort };
    patchJournalUiState(patch);
  }, [hydrated, sort]);

  return { sort, setSort, hydrated };
}

export function usePersistedJournalCalendarMonth(): {
  calendarMonth: JournalUiState["calendarMonth"];
  setCalendarMonth: Dispatch<SetStateAction<JournalUiState["calendarMonth"]>>;
} {
  const [calendarMonth, setCalendarMonth] = useState(() => defaultJournalUiState().calendarMonth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = readJournalUiState();
    setCalendarMonth(state.calendarMonth);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const patch: CalendarSlice = { calendarMonth };
    patchJournalUiState(patch);
  }, [hydrated, calendarMonth]);

  return { calendarMonth, setCalendarMonth };
}

export function usePersistedJournalMetricUnit(): {
  metricUnit: JournalUiState["metricUnit"];
  setMetricUnit: Dispatch<SetStateAction<JournalUiState["metricUnit"]>>;
} {
  const [metricUnit, setMetricUnit] = useState(() => defaultJournalUiState().metricUnit);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = readJournalUiState();
    setMetricUnit(state.metricUnit);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    patchJournalUiState({ metricUnit });
  }, [hydrated, metricUnit]);

  return { metricUnit, setMetricUnit };
}

export function usePersistedJournalComparePreset(): {
  comparePreset: JournalUiState["comparePreset"];
  setComparePreset: Dispatch<SetStateAction<JournalUiState["comparePreset"]>>;
} {
  const [comparePreset, setComparePreset] = useState(() => defaultJournalUiState().comparePreset);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = readJournalUiState();
    setComparePreset(state.comparePreset);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    patchJournalUiState({ comparePreset });
  }, [hydrated, comparePreset]);

  return { comparePreset, setComparePreset };
}
