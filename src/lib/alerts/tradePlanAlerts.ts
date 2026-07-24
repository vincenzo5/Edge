import type { AlertDrawingRole, AlertOperator } from "@/lib/persistence/schemas/alerts";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import { createAlert, type CreateAlertInput } from "@/lib/alerts/alertClient";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";

export function tradePlanOperatorForRole(
  direction: PositionOrderLevels["direction"],
  role: AlertDrawingRole,
): AlertOperator {
  if (direction === "long") {
    if (role === "stop") return "cross_below";
    return "cross_above";
  }
  if (role === "stop") return "cross_above";
  return "cross_below";
}

export function tradePlanMessageForRole(
  role: AlertDrawingRole,
  levels: PositionOrderLevels,
): string {
  const rr =
    levels.riskRewardRatio != null ? ` (${levels.riskRewardRatio.toFixed(1)}R)` : "";
  switch (role) {
    case "entry":
      return "Entry";
    case "stop":
      return "Stop";
    case "target":
      return `Target${rr}`;
  }
}

export function tradePlanRoleLabel(role: AlertDrawingRole): string {
  switch (role) {
    case "entry":
      return "Entry";
    case "stop":
      return "Stop";
    case "target":
      return "Target";
  }
}

export function buildTradePlanAlertInputs(input: {
  symbol: string;
  drawingId: string;
  levels: PositionOrderLevels;
  bundleId?: string;
}): CreateAlertInput[] {
  const bundleId = input.bundleId ?? crypto.randomUUID();
  const roles: AlertDrawingRole[] = ["entry", "stop", "target"];

  return roles.map((role) => ({
    symbol: input.symbol,
    operator: tradePlanOperatorForRole(input.levels.direction, role),
    price: input.levels[role],
    message: tradePlanMessageForRole(role, input.levels),
    drawingId: input.drawingId,
    drawingRole: role,
    bundleId,
    recurrence: "once",
  }));
}

export function tradePlanPricePatchForRole(
  levels: PositionOrderLevels,
  role: AlertDrawingRole,
): { price: number; operator: AlertOperator } {
  return {
    price: levels[role],
    operator: tradePlanOperatorForRole(levels.direction, role),
  };
}

export async function createTradePlanAlerts(input: {
  symbol: string;
  drawingId: string;
  levels: PositionOrderLevels;
}): Promise<AlertDefinitionResponse[]> {
  const inputs = buildTradePlanAlertInputs(input);
  const created: AlertDefinitionResponse[] = [];
  for (const alertInput of inputs) {
    created.push(await createAlert(alertInput));
  }
  return created;
}

export function formatTradePlanBundleLabel(bundleId: string | null | undefined): string | null {
  if (!bundleId) return null;
  return `Trade plan · ${bundleId.slice(0, 8)}`;
}
