import {
  DEFAULT_CHART_TIMEZONE,
  normalizeChartTimeZone,
  type ChartTimeZone,
} from "@/lib/chart/timeZone";

export const APP_TIMEZONE_PREFERENCE_KEY = "edge:app:timeZone:v1";

const APP_TIMEZONE_EVENT = "edge:appTimeZone";

export function detectBrowserTimeZone(): ChartTimeZone {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeChartTimeZone(zone);
  } catch {
    return DEFAULT_CHART_TIMEZONE;
  }
}

export function readAppTimeZonePreference(): ChartTimeZone | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_TIMEZONE_PREFERENCE_KEY);
    if (!raw) return null;
    return normalizeChartTimeZone(raw);
  } catch {
    return null;
  }
}

export function writeAppTimeZonePreference(timeZone: ChartTimeZone): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeChartTimeZone(timeZone);
  try {
    window.localStorage.setItem(APP_TIMEZONE_PREFERENCE_KEY, normalized);
    window.dispatchEvent(
      new CustomEvent<ChartTimeZone>(APP_TIMEZONE_EVENT, { detail: normalized }),
    );
    void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
      notifyUserPreferencesChanged(),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function subscribeAppTimeZonePreference(
  listener: (timeZone: ChartTimeZone) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ChartTimeZone>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(APP_TIMEZONE_EVENT, handler);
  return () => window.removeEventListener(APP_TIMEZONE_EVENT, handler);
}

/** Resolve timezone for first client paint after hydration. */
export function resolveInitialAppTimeZone(): ChartTimeZone {
  return readAppTimeZonePreference() ?? detectBrowserTimeZone();
}

export function migrateAppTimeZoneIfNeeded(): ChartTimeZone {
  const stored = readAppTimeZonePreference();
  if (stored) return stored;
  const detected = detectBrowserTimeZone();
  writeAppTimeZonePreference(detected);
  return detected;
}
