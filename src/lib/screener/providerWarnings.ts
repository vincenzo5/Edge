import type { SavedScreen } from "./types";
import { isSavedMoversScreen, isTechnicalScreenQuery } from "./types";

/** User-facing hint when FMP-only presets are disabled after a provider restriction. */
export const SCREENER_FMP_UNAVAILABLE_TITLE =
  "FMP screener unavailable — restore your FMP subscription or run a technical screen with Massive configured.";

const FMP_RESTRICTION_PATTERNS = [
  /FMP_API_KEY is not configured/i,
  /FMP endpoint restricted/i,
  /FMP.*\b(402|403)\b/i,
  /FMP.*\b(suspended|restricted)\b/i,
];

export function isScreenerProviderRestrictionWarning(warning: string): boolean {
  const trimmed = warning.trim();
  if (!trimmed) return false;
  return FMP_RESTRICTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function screenerHasProviderRestriction(warnings: readonly string[]): boolean {
  return warnings.some(isScreenerProviderRestrictionWarning);
}

/** Movers and descriptive (non-technical) screener queries require FMP. */
export function isFmpOnlySavedScreen(screen: SavedScreen): boolean {
  if (isSavedMoversScreen(screen)) return true;
  return !isTechnicalScreenQuery(screen.query);
}

export function isSavedScreenDisabledByProviderRestriction(
  screen: SavedScreen,
  warnings: readonly string[],
): boolean {
  return screenerHasProviderRestriction(warnings) && isFmpOnlySavedScreen(screen);
}
