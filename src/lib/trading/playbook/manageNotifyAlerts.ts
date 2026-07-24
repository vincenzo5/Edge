import type { AlertOperator } from "@/lib/persistence/schemas/alerts";

import { formatManageStepPreview } from "./display";
import { planPlaybookSteps } from "./planSteps";
import type { ManageStep, PlaybookTemplate, PositionPlan } from "./types";

export type ManageNotifyAlertInput = {
  symbol: string;
  operator: AlertOperator;
  price: number;
  message: string;
  recurrence: "once";
  bundleId: string;
};

export function manageNotifyOperatorForSide(side: PositionPlan["side"]): AlertOperator {
  return side === "BUY" ? "cross_above" : "cross_below";
}

function manageNotifyMessage(step: ManageStep): string {
  return `Manage · ${formatManageStepPreview(step)}`;
}

/** Pure planner: template + locked plan → notify-only price alerts (skips non-price whens). */
export function buildManageNotifyAlertInputs(input: {
  template: PlaybookTemplate;
  positionPlan: PositionPlan;
  bundleId?: string;
}): { bundleId: string; alerts: ManageNotifyAlertInput[] } {
  const bundleId = input.bundleId ?? crypto.randomUUID();
  const operator = manageNotifyOperatorForSide(input.positionPlan.side);
  const symbol = input.positionPlan.symbol.trim().toUpperCase();
  const steps = planPlaybookSteps(input.template, input.positionPlan);

  const alerts: ManageNotifyAlertInput[] = [];
  for (const step of steps) {
    if (step.triggerPrice == null) continue;
    alerts.push({
      symbol,
      operator,
      price: step.triggerPrice,
      message: manageNotifyMessage(step),
      recurrence: "once",
      bundleId,
    });
  }

  return { bundleId, alerts };
}

export function formatManageNotifySummary(steps: ManageStep[]): string {
  const priced = steps.filter((step) => step.triggerPrice != null);
  if (priced.length === 0) {
    return "No price-based manage levels to notify.";
  }
  return priced.map((step) => formatManageStepPreview(step)).join("; ");
}
