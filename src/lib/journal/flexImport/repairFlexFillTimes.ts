import {
  FLEX_FILL_TIME_ZONE,
  reinterpretUtcComponentsAsEastern,
} from "@/lib/journal/flexImport/flexDateTime";

/**
 * Heuristic for Flex rows imported under UTC process TZ where Eastern wall
 * clocks were stored as UTC (`new Date(y,m,d,h,mi,s)` in a UTC container).
 *
 * Signature of the bug (EDT example):
 *   Flex `20260803;093000` → stored `09:30:00Z` → displays `05:30` ET
 * Correct:
 *   Flex `20260803;093000` → stored `13:30:00Z` → displays `09:30` ET
 *
 * Idempotency:
 * - Only `source = flex_csv` (never live / flex_api).
 * - Candidate when America/New_York hour of the stored instant is in [4, 8]
 *   (classic EST/EDT mis-shift of 9:xx–12:xx RTH walls) AND repairing moves
 *   the ET hour into [8, 17].
 * - After repair, ET hour leaves [4, 8], so a second run skips the row.
 * - `--all-flex` repairs every flex_csv row once; callers must persist a state
 *   file of repaired execIds to avoid double-shifting on re-run without the
 *   hour-band guard.
 */
export function nyHourOfIso(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLEX_FILL_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const hourPart = parts.find((part) => part.type === "hour")?.value;
  if (hourPart == null) return null;
  let hour = Number(hourPart);
  if (hour === 24) hour = 0;
  return Number.isFinite(hour) ? hour : null;
}

export function isLikelyWrongFlexUtcImport(storedIso: string): boolean {
  const etHour = nyHourOfIso(storedIso);
  if (etHour == null || etHour < 4 || etHour > 8) return false;
  const repaired = reinterpretUtcComponentsAsEastern(storedIso);
  if (repaired === new Date(storedIso).toISOString()) return false;
  const repairedEt = nyHourOfIso(repaired);
  if (repairedEt == null || repairedEt < 8 || repairedEt > 17) return false;
  return true;
}

export type FlexFillTimeRepairPlan = {
  execId: string;
  fromIso: string;
  toIso: string;
  reason: "heuristic_et_hour_band" | "all_flex";
};

export function planFlexFillTimeRepair(
  rows: Array<{ execId: string; fillTime: string; source: string }>,
  options: { allFlex?: boolean; alreadyRepairedExecIds?: Set<string> } = {},
): FlexFillTimeRepairPlan[] {
  const plans: FlexFillTimeRepairPlan[] = [];
  const done = options.alreadyRepairedExecIds ?? new Set<string>();

  for (const row of rows) {
    if (row.source !== "flex_csv") continue;
    if (done.has(row.execId)) continue;

    const fromIso = new Date(row.fillTime).toISOString();
    const toIso = reinterpretUtcComponentsAsEastern(fromIso);
    if (toIso === fromIso) continue;

    if (options.allFlex) {
      plans.push({ execId: row.execId, fromIso, toIso, reason: "all_flex" });
      continue;
    }

    if (isLikelyWrongFlexUtcImport(fromIso)) {
      plans.push({
        execId: row.execId,
        fromIso,
        toIso,
        reason: "heuristic_et_hour_band",
      });
    }
  }

  return plans;
}
