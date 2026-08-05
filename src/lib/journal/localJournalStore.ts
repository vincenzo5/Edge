import type { JournalFill, JournalSnapshot, JournalTrade } from "@/lib/journal/types";
import { JOURNAL_LOCAL_STORAGE_KEY } from "@/lib/journal/types";
import { mergeJournalFills } from "@/lib/journal/mapExecutionToFill";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";
import { applyInitialStopPlannedRisk } from "@/lib/journal/tradeRiskGeometry";

const EMPTY_SNAPSHOT: JournalSnapshot = {
  fills: [],
  trades: [],
  updatedAt: 0,
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLocalJournalSnapshot(): JournalSnapshot {
  if (!canUseStorage()) return EMPTY_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(JOURNAL_LOCAL_STORAGE_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as JournalSnapshot;
    return {
      fills: Array.isArray(parsed.fills) ? parsed.fills : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export function writeLocalJournalSnapshot(snapshot: JournalSnapshot): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    JOURNAL_LOCAL_STORAGE_KEY,
    JSON.stringify({ ...snapshot, updatedAt: Date.now() }),
  );
}

export function upsertLocalJournalFills(incoming: JournalFill[]): JournalSnapshot {
  const current = readLocalJournalSnapshot();
  const next: JournalSnapshot = {
    ...current,
    fills: mergeJournalFills(current.fills, incoming),
    updatedAt: Date.now(),
  };
  writeLocalJournalSnapshot(next);
  return next;
}

export function replaceLocalJournalTrades(trades: JournalTrade[]): JournalSnapshot {
  const current = readLocalJournalSnapshot();
  const next: JournalSnapshot = {
    ...current,
    trades,
    updatedAt: Date.now(),
  };
  writeLocalJournalSnapshot(next);
  return next;
}

export function patchLocalJournalTrade(
  tradeId: string,
  patch: Partial<
    Pick<
      JournalTrade,
      | "tags"
      | "setup"
      | "reviewNote"
      | "plannedRiskMode"
      | "plannedRiskValue"
      | "plannedRiskUsd"
      | "initialStop"
      | "rating"
      | "ignored"
      | "mfeUsd"
      | "mfaUsd"
      | "excursionInterval"
      | "excursionComputedAt"
    >
  >,
): JournalTrade | null {
  const current = readLocalJournalSnapshot();
  let updated: JournalTrade | null = null;
  const trades = current.trades.map((trade) => {
    if (trade.id !== tradeId) return trade;
    const merged = { ...trade, ...patch };

    if (patch.initialStop !== undefined) {
      const applied = applyInitialStopPlannedRisk(merged, patch.initialStop);
      merged.initialStop = applied.initialStop;
      merged.plannedRiskMode = applied.plannedRiskMode;
      merged.plannedRiskValue = applied.plannedRiskValue;
      merged.plannedRiskUsd = applied.plannedRiskUsd;
    } else {
      const plannedRiskUsd =
        patch.plannedRiskMode !== undefined || patch.plannedRiskValue !== undefined
          ? computePlannedRiskUsd(
              merged,
              merged.plannedRiskMode ?? null,
              merged.plannedRiskValue ?? null,
            )
          : (patch.plannedRiskUsd ?? merged.plannedRiskUsd ?? null);
      merged.plannedRiskUsd = plannedRiskUsd;
    }

    updated = {
      ...merged,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) return null;
  writeLocalJournalSnapshot({ ...current, trades, updatedAt: Date.now() });
  return updated;
}

export function clearLocalJournalSnapshot(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(JOURNAL_LOCAL_STORAGE_KEY);
}
