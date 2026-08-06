import type { AccountPnL, AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { derivePlannedRiskFromPositionPlan } from "@/lib/trading/playbook/journalRiskHandoff";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import type { OrderDraft } from "@/lib/trading/types";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import { resolveAccountBasisValue, type RiskSettings } from "./riskSettings";

/** Near-cap threshold for Measurement chrome (80% of cap). */
export const ACCOUNT_GATE_NEAR_CAP_RATIO = 0.8;

export type AccountGateEvaluationInput = {
  settings: RiskSettings;
  netLiquidation: number | null;
  dailyPnL: number | null;
  openHeatDollars: number;
  proposedRiskDollars?: number | null;
  openPositionCount?: number;
  trackedPlanCount?: number;
};

export type AccountGateSlotStatus = {
  enabled: boolean;
  capPercent: number | null;
  capDollars: number | null;
  currentDollars: number | null;
  currentPercent: number | null;
  breached: boolean;
  nearCap: boolean;
  /** Open heat only — some open positions lack Manage PositionPlan. */
  incomplete: boolean;
};

export type AccountGateStatus = {
  dayLoss: AccountGateSlotStatus;
  openHeat: AccountGateSlotStatus;
};

export type AccountGateBlockReason = "day_loss_cap" | "open_heat_cap";

export function resolveAccountCapDollars(
  netLiquidation: number | null,
  capPercent: number | null | undefined,
): number | null {
  if (
    netLiquidation == null ||
    !Number.isFinite(netLiquidation) ||
    netLiquidation <= 0 ||
    capPercent == null ||
    !Number.isFinite(capPercent) ||
    capPercent <= 0
  ) {
    return null;
  }
  return Math.round(netLiquidation * (capPercent / 100));
}

export function sumOpenHeatFromPlaybookInstances(instances: PlaybookInstance[]): {
  heatDollars: number;
  trackedPlans: number;
} {
  let heatDollars = 0;
  let trackedPlans = 0;
  for (const instance of instances) {
    if (instance.status === "detached" || instance.status === "completed") continue;
    const derived = derivePlannedRiskFromPositionPlan(instance.positionPlan);
    if (!derived) continue;
    heatDollars += derived.value;
    trackedPlans += 1;
  }
  return { heatDollars, trackedPlans };
}

export function isRiskIncreasingEntry(
  draft: OrderDraft,
  _positions: AccountPosition[],
): boolean {
  return draft.side === "BUY";
}

export function evaluateAccountRiskGates(
  input: AccountGateEvaluationInput,
): AccountGateStatus {
  const netLiq = input.netLiquidation;
  const dayCapPercent = input.settings.periodLossCapPercent ?? null;
  const heatCapPercent = input.settings.openHeatCapPercent ?? null;
  const dayCapDollars = resolveAccountCapDollars(netLiq, dayCapPercent);
  const heatCapDollars = resolveAccountCapDollars(netLiq, heatCapPercent);

  const dailyPnL = input.dailyPnL;
  const dayBreached =
    dayCapDollars != null &&
    dailyPnL != null &&
    Number.isFinite(dailyPnL) &&
    dailyPnL <= -dayCapDollars;
  const dayNearCap =
    dayCapDollars != null &&
    dailyPnL != null &&
    Number.isFinite(dailyPnL) &&
    dailyPnL < 0 &&
    Math.abs(dailyPnL) >= dayCapDollars * ACCOUNT_GATE_NEAR_CAP_RATIO &&
    !dayBreached;

  const proposed = input.proposedRiskDollars ?? 0;
  const heatTotal =
    input.openHeatDollars +
    (proposed != null && Number.isFinite(proposed) && proposed > 0 ? proposed : 0);
  const heatPercent =
    netLiq != null && netLiq > 0 ? (input.openHeatDollars / netLiq) * 100 : null;
  const heatTotalPercent = netLiq != null && netLiq > 0 ? (heatTotal / netLiq) * 100 : null;
  const heatBreached = heatCapDollars != null && heatTotal > heatCapDollars;
  const heatNearCap =
    heatCapDollars != null &&
    heatTotal >= heatCapDollars * ACCOUNT_GATE_NEAR_CAP_RATIO &&
    !heatBreached;

  const openCount = input.openPositionCount ?? 0;
  const tracked = input.trackedPlanCount ?? 0;
  const heatIncomplete = openCount > 0 && tracked < openCount;

  return {
    dayLoss: {
      enabled: dayCapPercent != null,
      capPercent: dayCapPercent,
      capDollars: dayCapDollars,
      currentDollars: dailyPnL,
      currentPercent:
        netLiq != null && netLiq > 0 && dailyPnL != null && Number.isFinite(dailyPnL)
          ? (Math.abs(Math.min(dailyPnL, 0)) / netLiq) * 100
          : null,
      breached: dayBreached,
      nearCap: dayNearCap,
      incomplete: false,
    },
    openHeat: {
      enabled: heatCapPercent != null,
      capPercent: heatCapPercent,
      capDollars: heatCapDollars,
      currentDollars: input.openHeatDollars,
      currentPercent: heatPercent,
      breached: heatBreached,
      nearCap: heatNearCap,
      incomplete: heatIncomplete,
    },
  };
}

export function accountGateBlockReasons(
  status: AccountGateStatus,
  options?: { proposedRiskDollars?: number | null },
): string[] {
  const reasons: string[] = [];
  if (status.dayLoss.breached) {
    reasons.push(
      `Daily loss cap reached (${formatSignedMoney(status.dayLoss.currentDollars)} vs −${formatMoney(status.dayLoss.capDollars)} cap)`,
    );
  }
  const proposed = options?.proposedRiskDollars ?? 0;
  const projectedHeat =
    (status.openHeat.currentDollars ?? 0) +
    (proposed != null && Number.isFinite(proposed) && proposed > 0 ? proposed : 0);
  if (
    status.openHeat.enabled &&
    status.openHeat.capDollars != null &&
    projectedHeat > status.openHeat.capDollars
  ) {
    reasons.push(
      `Open heat cap would be exceeded (${formatMoney(projectedHeat)} vs ${formatMoney(status.openHeat.capDollars)} cap)`,
    );
  }
  return reasons;
}

export function buildAccountGateEvaluationInput(args: {
  settings: RiskSettings;
  accountSummary: AccountSummary | null;
  pnl: AccountPnL | null | undefined;
  playbookInstances: PlaybookInstance[];
  openPositionCount: number;
  proposedRiskDollars?: number | null;
}): AccountGateEvaluationInput {
  const netLiquidation = resolveAccountBasisValue(args.accountSummary);
  const { heatDollars, trackedPlans } = sumOpenHeatFromPlaybookInstances(
    args.playbookInstances,
  );
  return {
    settings: args.settings,
    netLiquidation,
    dailyPnL: args.pnl?.dailyPnL ?? null,
    openHeatDollars: heatDollars,
    proposedRiskDollars: args.proposedRiskDollars,
    openPositionCount: args.openPositionCount,
    trackedPlanCount: trackedPlans,
  };
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatSignedMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = formatMoney(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatDayLossGateLine(status: AccountGateSlotStatus): string | null {
  if (!status.enabled) return null;
  const cap = formatMoney(status.capDollars);
  const current = formatSignedMoney(status.currentDollars);
  return `Day P&L ${current} / −${cap} cap`;
}

export function formatOpenHeatGateLine(status: AccountGateSlotStatus): string | null {
  if (!status.enabled) return null;
  const cap = formatMoney(status.capDollars);
  const current = formatMoney(status.currentDollars);
  const pct =
    status.currentPercent != null && Number.isFinite(status.currentPercent)
      ? ` (${status.currentPercent.toFixed(1)}%)`
      : "";
  let line = `Open heat ${current}${pct} / ${cap} cap`;
  if (status.incomplete) {
    line += " · some positions untracked";
  }
  return line;
}

export function accountGateTone(
  status: AccountGateSlotStatus,
): "neutral" | "warning" | "danger" {
  if (status.breached) return "danger";
  if (status.nearCap || status.incomplete) return "warning";
  return "neutral";
}
