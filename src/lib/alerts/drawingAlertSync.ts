import type { SerializedDrawing } from "@edge/chart-core/contracts";
import {
  alertGeometryPatchFromDrawing,
  geometryFingerprint,
  isAlertableDrawingKind,
} from "@/lib/alerts/drawingAlertGeometry";
import {
  expireAlertsForDrawingId,
  fetchAlerts,
  patchAlert,
  patchAlertsByDrawingId,
} from "@/lib/alerts/alertClient";
import { tradePlanPricePatchForRole } from "@/lib/alerts/tradePlanAlerts";
import {
  isPositionDrawingName,
  positionOrderLevelsFromDrawing,
} from "@/lib/trading/positionTradeSetup";

function isDrawingBoundForAlerts(name: string): boolean {
  return isAlertableDrawingKind(name) || isPositionDrawingName(name);
}

export function positionLevelsFingerprint(drawing: SerializedDrawing): string {
  const levels = positionOrderLevelsFromDrawing(drawing);
  if (!levels) return "";
  return `${levels.entry}|${levels.stop}|${levels.target}|${levels.direction}`;
}

async function syncTradePlanAlerts(drawingId: string, drawing: SerializedDrawing): Promise<void> {
  const levels = positionOrderLevelsFromDrawing(drawing);
  if (!levels) return;

  const alerts = await fetchAlerts();
  const bound = alerts.filter(
    (alert) =>
      alert.drawingId === drawingId &&
      alert.drawingRole != null &&
      alert.status !== "expired",
  );

  await Promise.all(
    bound.map((alert) => {
      const patch = tradePlanPricePatchForRole(levels, alert.drawingRole!);
      return patchAlert(alert.id, patch);
    }),
  );
}

export async function syncAlertsWithDrawingChanges(
  previousDrawings: SerializedDrawing[],
  nextDrawings: SerializedDrawing[],
): Promise<void> {
  const previousById = new Map(
    previousDrawings.filter((drawing) => drawing.id).map((drawing) => [drawing.id!, drawing]),
  );
  const nextById = new Map(
    nextDrawings.filter((drawing) => drawing.id).map((drawing) => [drawing.id!, drawing]),
  );

  for (const [drawingId, previous] of previousById) {
    if (nextById.has(drawingId)) continue;
    if (!isDrawingBoundForAlerts(previous.name)) continue;
    await expireAlertsForDrawingId(drawingId);
  }

  for (const [drawingId, next] of nextById) {
    const previous = previousById.get(drawingId);

    if (isPositionDrawingName(next.name)) {
      if (previous && positionLevelsFingerprint(previous) === positionLevelsFingerprint(next)) {
        continue;
      }
      await syncTradePlanAlerts(drawingId, next);
      continue;
    }

    if (!isAlertableDrawingKind(next.name)) continue;
    if (previous && geometryFingerprint(previous) === geometryFingerprint(next)) continue;

    const patch = alertGeometryPatchFromDrawing(next);
    if (!patch) continue;
    await patchAlertsByDrawingId(drawingId, patch);
  }
}
