import type { AlertSymbolStateEntry } from "@/lib/persistence/schemas/alerts";

/** Wall-clock freshness window for client-posted script condition snapshots. */
export const SCRIPT_ALERT_SNAPSHOT_FRESHNESS_MS = 5 * 60 * 1000;

export function isScriptSnapshotFresh(
  entry: AlertSymbolStateEntry,
  nowMs: number = Date.now(),
): boolean {
  const snapshotAt = entry.lastScriptSnapshotAt;
  if (!snapshotAt) return false;
  const ageMs = nowMs - Date.parse(snapshotAt);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= SCRIPT_ALERT_SNAPSHOT_FRESHNESS_MS;
}

export function evaluateScriptConditionFromSnapshot(
  entry: AlertSymbolStateEntry,
  nowMs: number = Date.now(),
): boolean {
  if (!isScriptSnapshotFresh(entry, nowMs)) return false;
  return entry.lastScriptSatisfied === true;
}
