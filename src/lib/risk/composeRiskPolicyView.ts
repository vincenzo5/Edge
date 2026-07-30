import { z } from "zod";
import { buildFixedStopLeg } from "@/lib/trading/bracketPlan";
import { PLAYBOOK_PRESET_IDS } from "@/lib/trading/playbook/presets";
import { plannedRiskDollars } from "@/lib/trading/positionTradeSetup";
import {
  BracketPlanSchema,
  BracketStopLegSchema,
  OrderSideSchema,
  TradingEnvironmentSchema,
} from "@/lib/trading/types";
import type { BracketPlan, OrderSide } from "@/lib/trading/types";
import {
  summarizeSubmitRiskPlan,
  summarizeSubmitRiskPlanFromBracket,
  type SubmitRiskPlanSummary,
} from "./summarizeSubmitRiskPlan";

const ManagePresetIdSchema = z.union([
  z.literal("off"),
  z.enum(PLAYBOOK_PRESET_IDS),
]);

export const ComposeRiskPolicyViewInputSchema = z.object({
  environment: TradingEnvironmentSchema.default("paper"),
  side: OrderSideSchema,
  quantity: z.number().positive(),
  /** Session Budget ($ or % resolved). Optional when caller fills from get_risk_settings. */
  dollarRisk: z.number().positive().optional(),
  entry: z.number().positive(),
  initialStop: z.number().positive(),
  takeProfitPrice: z.number().positive().optional(),
  attachProtect: z.boolean().default(false),
  stopLeg: BracketStopLegSchema.optional(),
  managePresetId: ManagePresetIdSchema.default("off"),
  /** Optional full bracket when caller already has ticket state. */
  bracketPlan: BracketPlanSchema.optional(),
});

export type ComposeRiskPolicyViewInput = z.infer<typeof ComposeRiskPolicyViewInputSchema>;

export type RiskPolicyGeometryView = {
  direction: "long" | "short";
  entry: number;
  initialStop: number;
  takeProfitPrice: number | null;
};

export type RiskPolicyMeasurementView = {
  rUnit: number;
  plannedRiskDollars: number | null;
  riskRewardRatio: number | null;
};

export type RiskPolicyView = {
  geometry: RiskPolicyGeometryView;
  measurement: RiskPolicyMeasurementView;
  budget: SubmitRiskPlanSummary["budget"];
  sizing: SubmitRiskPlanSummary["size"];
  protect: SubmitRiskPlanSummary["protect"];
  manage: SubmitRiskPlanSummary["manage"];
  warnings: SubmitRiskPlanSummary["warnings"];
  failureMode: SubmitRiskPlanSummary["failureMode"];
  gapGuidance: SubmitRiskPlanSummary["gapGuidance"];
  gates: {
    label: string;
  };
};

function directionFromSide(side: OrderSide): "long" | "short" {
  return side === "BUY" ? "long" : "short";
}

function buildPreviewBracketPlan(input: ComposeRiskPolicyViewInput): BracketPlan | null {
  if (!input.attachProtect) return null;

  if (input.bracketPlan) {
    return input.bracketPlan;
  }

  const stopLeg = input.stopLeg ?? buildFixedStopLeg(input.initialStop);
  const takeProfitPrice =
    input.takeProfitPrice ??
    (input.side === "BUY"
      ? input.entry + Math.abs(input.entry - input.initialStop) * 2
      : input.entry - Math.abs(input.entry - input.initialStop) * 2);

  return {
    entry: {
      accountId: "preview",
      symbol: "PREVIEW",
      side: input.side,
      quantity: input.quantity,
      orderType: "MKT",
      environment: input.environment,
      outsideRth: false,
      tif: "DAY",
    },
    stopLeg,
    takeProfitPrice,
  };
}

/** View-only RiskPolicy compose from Plan + Protect + Manage inputs — no runtime merge. */
export function composeRiskPolicyView(input: ComposeRiskPolicyViewInput): RiskPolicyView {
  const parsed = ComposeRiskPolicyViewInputSchema.parse(input);
  const direction = directionFromSide(parsed.side);
  const rUnit = Math.abs(parsed.entry - parsed.initialStop);
  const computedPlannedRisk = plannedRiskDollars(parsed.entry, parsed.initialStop, parsed.quantity);
  const plannedRiskDollarsValue =
    computedPlannedRisk > 0 && Number.isFinite(computedPlannedRisk) ? computedPlannedRisk : null;

  const takeProfitPrice =
    parsed.takeProfitPrice ?? parsed.bracketPlan?.takeProfitPrice ?? null;

  let riskRewardRatio: number | null = null;
  if (takeProfitPrice != null && rUnit > 0) {
    riskRewardRatio = Math.abs(takeProfitPrice - parsed.entry) / rUnit;
  }

  const bracketPlan = buildPreviewBracketPlan(parsed);

  const submitSummary =
    bracketPlan != null
      ? summarizeSubmitRiskPlanFromBracket({
          environment: parsed.environment,
          quantity: parsed.quantity,
          dollarRisk: parsed.dollarRisk ?? null,
          plannedRiskDollars: plannedRiskDollarsValue,
          attachProtect: true,
          bracketPlan,
          managePresetId: parsed.managePresetId,
        })
      : summarizeSubmitRiskPlan({
          environment: parsed.environment,
          quantity: parsed.quantity,
          dollarRisk: parsed.dollarRisk ?? null,
          plannedRiskDollars: plannedRiskDollarsValue,
          protectAttached: false,
          stopLeg: null,
          takeProfitPrice: null,
          managePresetId: parsed.managePresetId,
        });

  return {
    geometry: {
      direction,
      entry: parsed.entry,
      initialStop: parsed.initialStop,
      takeProfitPrice,
    },
    measurement: {
      rUnit,
      plannedRiskDollars: plannedRiskDollarsValue,
      riskRewardRatio,
    },
    budget: submitSummary.budget,
    sizing: submitSummary.size,
    protect: submitSummary.protect,
    manage: submitSummary.manage,
    warnings: submitSummary.warnings,
    failureMode: submitSummary.failureMode,
    gapGuidance: submitSummary.gapGuidance,
    gates: {
      label:
        "inherits Plan/Protect — trading readiness, kill switch, short block, PDT soft, live confirm on live mutates",
    },
  };
}
