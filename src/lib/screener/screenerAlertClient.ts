import type { ScreenerAlertDefinitionResponse } from "@/lib/persistence/schemas/screenerAlerts";
import type { ScreenerAlertInterval, ScreenerAlertStatus } from "@/lib/persistence/schemas/screenerAlerts";
import {
  createLocalScreenerAlert,
  deleteLocalScreenerAlert,
  listLocalScreenerAlerts,
  updateLocalScreenerAlert,
} from "@/lib/screener/localScreenerAlertStore";

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchScreenerAlerts(): Promise<ScreenerAlertDefinitionResponse[]> {
  const response = await fetch("/api/me/screener-alerts", { cache: "no-store" });
  if (response.status === 503) return listLocalScreenerAlerts();
  if (!response.ok) throw new Error("Could not load screener alerts.");
  const payload = await parseJson<{ screenerAlerts: ScreenerAlertDefinitionResponse[] }>(response);
  return payload?.screenerAlerts ?? [];
}

export async function createScreenerAlert(input: {
  screenId: string;
  intervalMinutes?: ScreenerAlertInterval;
}): Promise<ScreenerAlertDefinitionResponse> {
  const response = await fetch("/api/me/screener-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 503) {
    return createLocalScreenerAlert({
      screenId: input.screenId,
      intervalMinutes: input.intervalMinutes ?? 60,
    });
  }
  if (!response.ok) throw new Error("Could not create screener alert.");
  const payload = await parseJson<ScreenerAlertDefinitionResponse>(response);
  if (!payload) throw new Error("Invalid screener alert create response.");
  return payload;
}

export async function patchScreenerAlert(
  alertId: string,
  patch: Partial<{
    intervalMinutes: ScreenerAlertInterval;
    status: ScreenerAlertStatus;
  }>,
): Promise<ScreenerAlertDefinitionResponse | null> {
  const response = await fetch(`/api/me/screener-alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (response.status === 503) return updateLocalScreenerAlert(alertId, patch);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not update screener alert.");
  return parseJson<ScreenerAlertDefinitionResponse>(response);
}

export async function removeScreenerAlert(alertId: string): Promise<boolean> {
  const response = await fetch(`/api/me/screener-alerts/${alertId}`, { method: "DELETE" });
  if (response.status === 503) return deleteLocalScreenerAlert(alertId);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Could not delete screener alert.");
  return true;
}

export async function upsertScreenerAlertForScreen(input: {
  screenId: string;
  enabled: boolean;
  intervalMinutes: ScreenerAlertInterval;
}): Promise<ScreenerAlertDefinitionResponse | null> {
  const existing = (await fetchScreenerAlerts()).find((alert) => alert.screenId === input.screenId);
  if (!input.enabled) {
    if (!existing) return null;
    await removeScreenerAlert(existing.id);
    return null;
  }
  if (existing) {
    return patchScreenerAlert(existing.id, {
      status: "active",
      intervalMinutes: input.intervalMinutes,
    });
  }
  return createScreenerAlert({
    screenId: input.screenId,
    intervalMinutes: input.intervalMinutes,
  });
}
