import {
  DAY_TYPE,
  GAP_TYPE,
  OPEN_TYPE,
  PARTICIPATION_TYPE,
  RELATIVE_TYPE,
  VOLATILITY_TYPE,
  type DayProfileFilters,
  type DayProfileQuery,
} from "./types";

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function labelForDayType(value: string): string {
  return titleCase(value);
}

export function labelForOpenType(value: string): string {
  return titleCase(value.replace(/^open_/, "open "));
}

export function labelForGap(value: string): string {
  return titleCase(value.replace(/^gap_/, "gap "));
}

export function labelForVolatility(value: string): string {
  return titleCase(value.replace(/^vol_/, "vol "));
}

export function labelForParticipation(value: string): string {
  return titleCase(value.replace(/^rvol_/, "rvol "));
}

export function labelForRelative(value: string): string {
  return titleCase(value);
}

export const DAY_TYPE_FILTER_OPTIONS = DAY_TYPE.map((value) => ({
  value,
  label: labelForDayType(value),
}));

export const OPEN_TYPE_FILTER_OPTIONS = OPEN_TYPE.map((value) => ({
  value,
  label: labelForOpenType(value),
}));

export const GAP_FILTER_OPTIONS = GAP_TYPE.map((value) => ({
  value,
  label: labelForGap(value),
}));

export const VOLATILITY_FILTER_OPTIONS = VOLATILITY_TYPE.map((value) => ({
  value,
  label: labelForVolatility(value),
}));

export const PARTICIPATION_FILTER_OPTIONS = PARTICIPATION_TYPE.map((value) => ({
  value,
  label: labelForParticipation(value),
}));

export const RELATIVE_FILTER_OPTIONS = RELATIVE_TYPE.map((value) => ({
  value,
  label: labelForRelative(value),
}));

export type DayProfilesUiFilters = {
  symbol: string;
  dayType: string;
  openType: string;
  gap: string;
  volatility: string;
  participation: string;
  relative: string;
};

export const EMPTY_DAY_PROFILES_UI_FILTERS: DayProfilesUiFilters = {
  symbol: "",
  dayType: "",
  openType: "",
  gap: "",
  volatility: "",
  participation: "",
  relative: "",
};

export function uiFiltersToQuery(filters: DayProfilesUiFilters): DayProfileQuery {
  const query: DayProfileQuery = {};
  if (filters.symbol.trim()) query.symbol = filters.symbol.trim().toUpperCase();
  if (filters.dayType) query.dayType = filters.dayType as DayProfileQuery["dayType"];
  if (filters.openType) query.openType = filters.openType as DayProfileQuery["openType"];
  if (filters.gap) query.gap = filters.gap as DayProfileQuery["gap"];
  if (filters.volatility) query.volatility = filters.volatility as DayProfileQuery["volatility"];
  if (filters.participation) {
    query.participation = filters.participation as DayProfileQuery["participation"];
  }
  if (filters.relative) query.relative = filters.relative as DayProfileQuery["relative"];
  return query;
}

export function countActiveDayProfileFilters(filters: DayProfilesUiFilters): number {
  return Object.values(filters).filter((value) => value.trim()).length;
}

export function buildDayProfileFilterChips(filters: DayProfilesUiFilters) {
  const chips: Array<{ id: string; label: string; clearKey: keyof DayProfilesUiFilters }> = [];
  if (filters.symbol.trim()) {
    chips.push({ id: "symbol", label: filters.symbol.trim().toUpperCase(), clearKey: "symbol" });
  }
  if (filters.dayType) {
    chips.push({ id: "dayType", label: labelForDayType(filters.dayType), clearKey: "dayType" });
  }
  if (filters.openType) {
    chips.push({ id: "openType", label: labelForOpenType(filters.openType), clearKey: "openType" });
  }
  if (filters.gap) {
    chips.push({ id: "gap", label: labelForGap(filters.gap), clearKey: "gap" });
  }
  if (filters.volatility) {
    chips.push({
      id: "volatility",
      label: labelForVolatility(filters.volatility),
      clearKey: "volatility",
    });
  }
  if (filters.participation) {
    chips.push({
      id: "participation",
      label: labelForParticipation(filters.participation),
      clearKey: "participation",
    });
  }
  if (filters.relative) {
    chips.push({
      id: "relative",
      label: labelForRelative(filters.relative),
      clearKey: "relative",
    });
  }
  return chips;
}

export function filtersToDayProfileFilters(filters: DayProfilesUiFilters): DayProfileFilters {
  return uiFiltersToQuery(filters);
}
