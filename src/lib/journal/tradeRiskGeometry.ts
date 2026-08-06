import type { JournalTradeDirection } from "@/lib/journal/types";
import { plannedRiskDollars } from "@/lib/trading/positionTradeSetup";

export type TradeRiskFillQuantity = {
  quantity: number;
  role?: "open" | "close" | null;
  side?: string | null;
};

export type TradeRiskGeometryInput = {
  direction: JournalTradeDirection;
  avgEntry?: number | null;
  netQuantity?: number | null;
  legs?: Array<{ netQuantity?: number | null }> | null;
  managePlaybook?: { positionPlan?: { qty?: number } | null } | null;
  /** @deprecated Prefer `fills` with roles/sides. Bare quantities alone are last-resort. */
  fillQuantities?: number[] | null;
  fills?: TradeRiskFillQuantity[] | null;
};

function isBuySide(side: string | null | undefined): boolean {
  const upper = (side ?? "").toUpperCase();
  return upper.includes("BOT") || upper === "BUY";
}

function isEntrySide(direction: JournalTradeDirection, side: string | null | undefined): boolean {
  const buy = isBuySide(side);
  return direction === "long" ? buy : !buy;
}

function quantityFromFills(
  direction: JournalTradeDirection,
  fills: TradeRiskFillQuantity[],
): number | null {
  if (fills.length === 0) return null;

  const hasRoles = fills.some((fill) => fill.role === "open" || fill.role === "close");
  if (hasRoles) {
    let openSum = 0;
    for (const fill of fills) {
      if (fill.role !== "open") continue;
      const qty = Math.abs(fill.quantity);
      if (Number.isFinite(qty)) openSum += qty;
    }
    return openSum > 0 ? openSum : null;
  }

  const hasSides = fills.some((fill) => fill.side != null && String(fill.side).trim() !== "");
  if (hasSides) {
    let entrySum = 0;
    for (const fill of fills) {
      if (!isEntrySide(direction, fill.side)) continue;
      const qty = Math.abs(fill.quantity);
      if (Number.isFinite(qty)) entrySum += qty;
    }
    return entrySum > 0 ? entrySum : null;
  }

  // Bare quantities with no role/side: do not use max single fill (LQDA bug).
  // Single fill is unambiguous; multiple bare fills are ambiguous → null.
  if (fills.length === 1) {
    const qty = Math.abs(fills[0]!.quantity);
    return Number.isFinite(qty) && qty > 0 ? qty : null;
  }
  return null;
}

export function resolveTradeRiskQuantity(trade: TradeRiskGeometryInput): number | null {
  const direct = Math.abs(trade.netQuantity ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const planQty = trade.managePlaybook?.positionPlan?.qty;
  if (planQty != null && Number.isFinite(planQty) && planQty > 0) {
    return Math.abs(planQty);
  }

  let legMax = 0;
  for (const leg of trade.legs ?? []) {
    const qty = Math.abs(leg.netQuantity ?? 0);
    if (qty > legMax) legMax = qty;
  }
  if (legMax > 0) return legMax;

  const fills =
    trade.fills ??
    (trade.fillQuantities ?? []).map((quantity) => ({ quantity }));
  return quantityFromFills(trade.direction, fills);
}

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

  const qty = resolveTradeRiskQuantity(trade);
  if (qty == null || qty <= 0) {
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
