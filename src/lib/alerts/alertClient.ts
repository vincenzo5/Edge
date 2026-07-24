import type {
  AlertCondition,
  AlertConditionCombinator,
  AlertDefinitionResponse,
  AlertTriggerEventResponse,
} from "@/lib/persistence/schemas/alerts";
import type {
  AlertDrawingKind,
  AlertDrawingRole,
  AlertOperator,
  AlertRecurrence,
  AlertStatus,
} from "@/lib/persistence/schemas/alerts";
import {
  createLocalAlert,
  deleteLocalAlert,
  listLocalAlerts,
  updateLocalAlert,
  applyLocalAlertSnapshot,
} from "@/lib/alerts/localAlertStore";

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchAlerts(): Promise<AlertDefinitionResponse[]> {
  const response = await fetch("/api/me/alerts", { cache: "no-store" });
  if (response.status === 503) return listLocalAlerts();
  if (!response.ok) throw new Error("Could not load alerts.");
  const payload = await parseJson<{ alerts: AlertDefinitionResponse[] }>(response);
  return payload?.alerts ?? [];
}

export async function fetchAlertById(alertId: string): Promise<AlertDefinitionResponse | null> {
  const response = await fetch(`/api/me/alerts/${alertId}`, { cache: "no-store" });
  if (response.status === 503) {
    return listLocalAlerts().find((alert) => alert.id === alertId) ?? null;
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load alert.");
  return parseJson<AlertDefinitionResponse>(response);
}

export async function fetchAlertEvents(
  alertId?: string,
): Promise<AlertTriggerEventResponse[]> {
  const query = alertId ? `?alertId=${encodeURIComponent(alertId)}` : "";
  const response = await fetch(`/api/me/alerts/events${query}`, { cache: "no-store" });
  if (response.status === 503) return [];
  if (!response.ok) throw new Error("Could not load alert events.");
  const payload = await parseJson<{ events: AlertTriggerEventResponse[] }>(response);
  return payload?.events ?? [];
}

export type CreateAlertInput = {
  symbol?: string;
  watchlistId?: string;
  operator?: AlertOperator;
  price?: number;
  message?: string | null;
  recurrence?: AlertRecurrence;
  combinator?: AlertConditionCombinator | null;
  conditions?: AlertCondition[];
  drawingId?: string;
  drawingKind?: AlertDrawingKind;
  priceHigh?: number | null;
  tlT0?: number | null;
  tlV0?: number | null;
  tlT1?: number | null;
  tlV1?: number | null;
  tlExtendLeft?: boolean | null;
  tlExtendRight?: boolean | null;
  drawingRole?: AlertDrawingRole;
  bundleId?: string;
};

export async function createAlert(input: CreateAlertInput): Promise<AlertDefinitionResponse> {
  const response = await fetch("/api/me/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 503) return createLocalAlert(input);
  if (!response.ok) throw new Error("Could not create alert.");
  const payload = await parseJson<AlertDefinitionResponse>(response);
  if (!payload) throw new Error("Invalid alert create response.");
  return payload;
}

export async function patchAlert(
  alertId: string,
  patch: Partial<{
    symbol: string | null;
    watchlistId: string | null;
    operator: AlertOperator;
    price: number;
    message: string | null;
    recurrence: AlertRecurrence;
    status: AlertStatus;
    expiresAt: string | null;
    combinator: AlertConditionCombinator | null;
    conditions: AlertCondition[];
    drawingId: string | null;
    drawingKind: AlertDrawingKind | null;
    priceHigh: number | null;
    tlT0: number | null;
    tlV0: number | null;
    tlT1: number | null;
    tlV1: number | null;
    tlExtendLeft: boolean | null;
    tlExtendRight: boolean | null;
    drawingRole: AlertDrawingRole | null;
    bundleId: string | null;
  }>,
): Promise<AlertDefinitionResponse | null> {
  const response = await fetch(`/api/me/alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (response.status === 503) return updateLocalAlert(alertId, patch);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not update alert.");
  return parseJson<AlertDefinitionResponse>(response);
}

export async function removeAlert(alertId: string): Promise<boolean> {
  const response = await fetch(`/api/me/alerts/${alertId}`, { method: "DELETE" });
  if (response.status === 503) return deleteLocalAlert(alertId);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Could not delete alert.");
  return true;
}

export async function patchAlertsByDrawingId(
  drawingId: string,
  patch: Parameters<typeof patchAlert>[1],
  options?: { drawingRole?: AlertDrawingRole },
): Promise<void> {
  const alerts = await fetchAlerts();
  const bound = alerts.filter((alert) => {
    if (alert.drawingId !== drawingId || alert.status === "expired") return false;
    if (options?.drawingRole) return alert.drawingRole === options.drawingRole;
    return true;
  });
  await Promise.all(bound.map((alert) => patchAlert(alert.id, patch)));
}

export async function expireAlertsForDrawingId(drawingId: string): Promise<void> {
  await patchAlertsByDrawingId(drawingId, { status: "expired" });
}

export async function expireAlertsForBundleId(bundleId: string): Promise<number> {
  const alerts = await fetchAlerts();
  const bound = alerts.filter(
    (alert) => alert.bundleId === bundleId && alert.status !== "expired",
  );
  if (bound.length === 0) return 0;
  await Promise.all(bound.map((alert) => patchAlert(alert.id, { status: "expired" })));
  return bound.length;
}

export type PostAlertSnapshotInput = {
  symbol: string;
  satisfied: boolean;
  barTime: number;
};

export async function postAlertSnapshot(
  alertId: string,
  input: PostAlertSnapshotInput,
): Promise<AlertDefinitionResponse> {
  const response = await fetch(`/api/me/alerts/${alertId}/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 503) return applyLocalAlertSnapshot(alertId, input);
  if (!response.ok) throw new Error("Could not post alert snapshot.");
  const payload = await parseJson<AlertDefinitionResponse>(response);
  if (!payload) throw new Error("Invalid alert snapshot response.");
  return payload;
}
