import {
  SCREENER_NARROW_LAYOUT_THRESHOLD,
  TILE_DENSITY_BREAKPOINTS,
  TILE_DENSITY_HYSTERESIS,
} from "./layoutConstants";

export type TileDensityMode = "compact" | "standard" | "wide";

const COMPACT_MAX = SCREENER_NARROW_LAYOUT_THRESHOLD;
const STANDARD_MAX = TILE_DENSITY_BREAKPOINTS.standard;
const HYSTERESIS = TILE_DENSITY_HYSTERESIS;

export function resolveTileDensityMode(
  width: number,
  previousMode?: TileDensityMode,
): TileDensityMode {
  if (previousMode === "wide") {
    if (width >= STANDARD_MAX - HYSTERESIS) return "wide";
    if (width >= COMPACT_MAX - HYSTERESIS) return "standard";
    return "compact";
  }

  if (previousMode === "standard") {
    if (width >= STANDARD_MAX + HYSTERESIS) return "wide";
    if (width >= COMPACT_MAX - HYSTERESIS) return "standard";
    return "compact";
  }

  if (previousMode === "compact") {
    if (width >= STANDARD_MAX + HYSTERESIS) return "wide";
    if (width >= COMPACT_MAX + HYSTERESIS) return "standard";
    return "compact";
  }

  if (width < COMPACT_MAX) return "compact";
  if (width < STANDARD_MAX) return "standard";
  return "wide";
}

export function journalSummaryGridClass(mode: TileDensityMode): string {
  switch (mode) {
    case "compact":
      return "grid grid-cols-1 gap-2";
    case "standard":
      return "grid grid-cols-2 gap-2";
    case "wide":
      return "grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8";
  }
}

export function journalHeroCardSpanClass(mode: TileDensityMode): string {
  switch (mode) {
    case "compact":
      return "";
    case "standard":
      return "";
    case "wide":
      return "md:col-span-2";
  }
}

export function journalDashboardSectionGridClass(
  mode: TileDensityMode,
  minHeightClass: string,
): string {
  const base = `mt-4 grid gap-4 ${minHeightClass}`;
  return mode === "wide" ? `${base} lg:grid-cols-2 lg:items-stretch` : base;
}

export function journalMetricGridClass(mode: TileDensityMode): string {
  switch (mode) {
    case "compact":
      return "grid grid-cols-2 gap-x-4 gap-y-3";
    case "standard":
      return "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3";
    case "wide":
      return "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4";
  }
}
