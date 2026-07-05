/** Relative age for watchlist quote timestamps (e.g. "12s", "2m"). */
export function formatQuoteAge(updatedAt: number | null | undefined, now = Date.now()): string | null {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return null;
  const ageMs = Math.max(0, now - updatedAt);
  if (ageMs < 1_000) return "just now";
  if (ageMs < 60_000) return `${Math.round(ageMs / 1_000)}s`;
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m`;
  return `${Math.round(ageMs / 3_600_000)}h`;
}

/** Whether to show a muted age hint beside the watchlist price. */
export function shouldShowQuoteAgeHint(updatedAt: number | null | undefined, now = Date.now()): boolean {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return false;
  return now - updatedAt > 30_000;
}
