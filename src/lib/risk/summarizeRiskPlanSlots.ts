import { computeEquityPositionSize, equityPositionSizeErrorMessage } from "./equityPositionSize";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";

export type RiskPlanSlotGap =
  | "no_bind"
  | "no_geometry"
  | "no_stop"
  | "unlinked"
  | "budget_unresolved";

export type RiskPlanBindRef = {
  cellId: string;
  drawingId: string;
};

export type RiskPlanLevelsInput = Pick<
  PositionOrderLevels,
  "entry" | "stop" | "direction"
>;

export type SummarizeRiskPlanSlotsInput = {
  bind: RiskPlanBindRef | null;
  linked: boolean;
  /** Live bound levels when linked; ignored for sizing when unlinked. */
  boundLevels: RiskPlanLevelsInput | null;
  /** Manual entry/stop from Risk panel when unlinked. */
  manualEntry: number | null;
  manualStop: number | null;
  dollarRisk: number | null;
};

export type RiskPlanSlotSummary = {
  gaps: RiskPlanSlotGap[];
  bindLabel: string | null;
  budget: {
    dollarRisk: number | null;
    resolved: boolean;
  };
  sizing: {
    shares: number | null;
    plannedRiskDollars: number | null;
    error: string | null;
  };
  geometry: {
    direction: "long" | "short" | null;
    entry: number | null;
    stop: number | null;
    linked: boolean;
  };
  canUseInTrade: boolean;
  useInTradeDisabledReason: string | null;
};

function shortId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return trimmed;
  return `…${trimmed.slice(-6)}`;
}

function resolveGeometry(input: SummarizeRiskPlanSlotsInput): {
  entry: number | null;
  stop: number | null;
  direction: "long" | "short" | null;
} {
  if (input.linked && input.boundLevels) {
    return {
      entry: input.boundLevels.entry,
      stop: input.boundLevels.stop,
      direction: input.boundLevels.direction,
    };
  }
  return {
    entry: input.manualEntry,
    stop: input.manualStop,
    direction: input.boundLevels?.direction ?? null,
  };
}

/** RiskPolicy Plan slot summary for Risk sidebar (Budget → Sizing + Geometry). */
export function summarizeRiskPlanSlots(
  input: SummarizeRiskPlanSlotsInput,
): RiskPlanSlotSummary {
  const gaps: RiskPlanSlotGap[] = [];
  const geometry = resolveGeometry(input);
  const budgetResolved =
    input.dollarRisk != null && Number.isFinite(input.dollarRisk) && input.dollarRisk > 0;

  if (input.bind == null) {
    gaps.push("no_bind");
  } else if (!input.linked) {
    gaps.push("unlinked");
  }

  if (geometry.entry == null || geometry.stop == null) {
    gaps.push("no_geometry");
  } else if (
    !Number.isFinite(geometry.entry) ||
    !Number.isFinite(geometry.stop) ||
    geometry.entry === geometry.stop
  ) {
    gaps.push("no_stop");
  }

  if (!budgetResolved) {
    gaps.push("budget_unresolved");
  }

  let sizing: RiskPlanSlotSummary["sizing"] = {
    shares: null,
    plannedRiskDollars: null,
    error: null,
  };

  if (geometry.entry != null && geometry.stop != null && budgetResolved) {
    const sizeResult = computeEquityPositionSize({
      entry: geometry.entry,
      stop: geometry.stop,
      dollarRisk: input.dollarRisk,
    });
    if (sizeResult.ok) {
      sizing = {
        shares: sizeResult.shares,
        plannedRiskDollars: sizeResult.actualRiskDollars,
        error: null,
      };
    } else {
      sizing = {
        shares: null,
        plannedRiskDollars: null,
        error: equityPositionSizeErrorMessage(sizeResult.reason),
      };
    }
  }

  const bindLabel =
    input.bind && geometry.direction
      ? `${shortId(input.bind.cellId)} · ${shortId(input.bind.drawingId)} · ${
          geometry.direction === "long" ? "Long" : "Short"
        }`
      : input.bind
        ? `${shortId(input.bind.cellId)} · ${shortId(input.bind.drawingId)}`
        : null;

  let useInTradeDisabledReason: string | null = null;
  if (input.bind == null) {
    useInTradeDisabledReason = "Bind a position drawing on the chart.";
  } else if (geometry.entry == null || geometry.stop == null) {
    useInTradeDisabledReason = "Entry and stop are required.";
  } else if (!budgetResolved) {
    useInTradeDisabledReason = "Resolve a risk budget first.";
  } else if (sizing.shares == null) {
    useInTradeDisabledReason = sizing.error ?? "Cannot size for current levels.";
  }

  const canUseInTrade = useInTradeDisabledReason == null;

  return {
    gaps,
    bindLabel,
    budget: {
      dollarRisk: input.dollarRisk,
      resolved: budgetResolved,
    },
    sizing,
    geometry: {
      direction: geometry.direction,
      entry: geometry.entry,
      stop: geometry.stop,
      linked: input.linked,
    },
    canUseInTrade,
    useInTradeDisabledReason,
  };
}

export function riskPlanGapLabel(gap: RiskPlanSlotGap): string {
  switch (gap) {
    case "no_bind":
      return "No drawing bound";
    case "no_geometry":
      return "Entry/stop missing";
    case "no_stop":
      return "Invalid stop distance";
    case "unlinked":
      return "Manual override — relink to sync chart";
    case "budget_unresolved":
      return "Budget not resolved";
    default:
      return gap;
  }
}
