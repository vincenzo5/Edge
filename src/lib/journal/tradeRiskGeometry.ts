import type { JournalTradeDirection } from "@/lib/journal/types";
import { plannedRiskDollars } from "@/lib/trading/positionTradeSetup";

export type TradeRiskGeometryInput = {
  direction: JournalTradeDirection;
  avgEntry?: number | null;
  netQuantity?: number | null;
};

export function isValidStopForDirection(
  direction: JournalTradeDirection,
  entry: number,
  stop: number,
): boolean {
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= 0 || stop <= 0) return false;
  if (direction === "long") return stop < entry;
  return stop > entry;
}

export function validateInitialStop(
  direction: JournalTradeDirection,
  entry: number | null | undefined,
  stop: number | null | undefined,
): string | null {
  if (stop == null) return null;
  if (entry == null || !Number.isFinite(entry)) {
    return "Entry price is required before setting a stop.";
  }
  if (!Number.isFinite(stop) || stop <= 0) {
    return "Stop must be a positive price.";
  }
  if (!isValidStopForDirection(direction, entry, stop)) {
    return direction === "long"
      ? "For long trades, stop must be below entry."
      : "For short trades, stop must be above entry.";
  }
  return null;
}

export function derivePlannedRiskFromStop(args: {
  entry: number;
  initialStop: number;
  qty: number;
}): { mode: "usd"; value: number; usd: number } | null {
  const value = plannedRiskDollars(args.entry, args.initialStop, args.qty);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { mode: "usd", value, usd: value };
}

export function resolveEffectiveInitialStop(trade: {
  initialStop?: number | null;
  managePlaybook?: { positionPlan?: { initialStop?: number } | null } | null;
}): number | null {
  if (trade.initialStop != null && Number.isFinite(trade.initialStop)) {
    return trade.initialStop;
  }
  const planStop = trade.managePlaybook?.positionPlan?.initialStop;
  if (planStop != null && Number.isFinite(planStop)) return planStop;
  return null;
}

export function computeStopDistancePerShare(entry: number, stop: number): number {
  return Math.abs(entry - stop);
}

export function applyInitialStopPlannedRisk(
  trade: TradeRiskGeometryInput,
  initialStop: number | null,
): {
  initialStop: number | null;
  plannedRiskMode: "usd" | null;
  plannedRiskValue: number | null;
  plannedRiskUsd: number | null;
} {
  if (initialStop == null) {
    return {
      initialStop: null,
      plannedRiskMode: null,
      plannedRiskValue: null,
      plannedRiskUsd: null,
    };
  }

  const validationError = validateInitialStop(trade.direction, trade.avgEntry, initialStop);
  if (validationError) {
    throw new Error(validationError);
  }

  const qty = Math.abs(trade.netQuantity ?? 0);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity is required to compute risk from stop.");
  }

  const derived = derivePlannedRiskFromStop({
    entry: trade.avgEntry!,
    initialStop,
    qty,
  });
  if (!derived) {
    throw new Error("Could not compute risk from entry and stop.");
  }

  return {
    initialStop,
    plannedRiskMode: derived.mode,
    plannedRiskValue: derived.value,
    plannedRiskUsd: derived.usd,
  };
}
