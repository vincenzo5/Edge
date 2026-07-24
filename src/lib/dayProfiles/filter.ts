import type { DayProfile, DayProfileFilters } from "./types";

export function filterDayProfiles(
  profiles: DayProfile[],
  filters: DayProfileFilters,
): DayProfile[] {
  const status = filters.status ?? "confirmed";

  return profiles.filter((profile) => {
    if (profile.status !== status) return false;
    if (filters.symbol && profile.symbol !== filters.symbol.toUpperCase()) return false;
    if (filters.universe && profile.universe !== filters.universe) return false;
    if (filters.dayType && profile.dayType !== filters.dayType) return false;
    if (filters.openType && profile.openType !== filters.openType) return false;
    if (filters.gap && profile.gap !== filters.gap) return false;
    if (filters.volatility && profile.volatility !== filters.volatility) return false;
    if (filters.participation && profile.participation !== filters.participation) return false;
    if (filters.relative && profile.relative !== filters.relative) return false;
    return true;
  });
}
