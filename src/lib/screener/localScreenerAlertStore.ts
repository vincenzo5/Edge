import type { ScreenerAlertDefinitionResponse } from "@/lib/persistence/schemas/screenerAlerts";
import type { ScreenerAlertInterval, ScreenerAlertStatus } from "@/lib/persistence/schemas/screenerAlerts";

const STORAGE_KEY = "edge:screener-alerts:v1";

type LocalScreenerAlertState = {
  version: 1;
  alerts: ScreenerAlertDefinitionResponse[];
};

function readState(): LocalScreenerAlertState {
  if (typeof window === "undefined") {
    return { version: 1, alerts: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, alerts: [] };
    const parsed = JSON.parse(raw) as LocalScreenerAlertState;
    if (parsed.version !== 1 || !Array.isArray(parsed.alerts)) {
      return { version: 1, alerts: [] };
    }
    return parsed;
  } catch {
    return { version: 1, alerts: [] };
  }
}

function writeState(state: LocalScreenerAlertState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listLocalScreenerAlerts(): ScreenerAlertDefinitionResponse[] {
  return [...readState().alerts].sort((a, b) => a.screenId.localeCompare(b.screenId));
}

export function getLocalScreenerAlertByScreenId(
  screenId: string,
): ScreenerAlertDefinitionResponse | null {
  return readState().alerts.find((alert) => alert.screenId === screenId) ?? null;
}

export function createLocalScreenerAlert(input: {
  screenId: string;
  intervalMinutes: ScreenerAlertInterval;
}): ScreenerAlertDefinitionResponse {
  const now = new Date().toISOString();
  const alert: ScreenerAlertDefinitionResponse = {
    id: crypto.randomUUID(),
    screenId: input.screenId.trim(),
    intervalMinutes: input.intervalMinutes,
    notifyOn: "added",
    status: "active",
    cooldownMs: 300_000,
    lastSymbols: [],
    lastRunAt: null,
    nextRunAt: now,
    lastFiredAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const state = readState();
  state.alerts = [alert, ...state.alerts.filter((row) => row.screenId !== alert.screenId)];
  writeState(state);
  return alert;
}

export function updateLocalScreenerAlert(
  alertId: string,
  patch: Partial<{
    intervalMinutes: ScreenerAlertInterval;
    status: ScreenerAlertStatus;
    lastSymbols: string[];
    lastRunAt: string | null;
    nextRunAt: string | null;
    lastFiredAt: string | null;
  }>,
): ScreenerAlertDefinitionResponse | null {
  const state = readState();
  const alert = state.alerts.find((row) => row.id === alertId);
  if (!alert) return null;
  if (patch.intervalMinutes !== undefined) alert.intervalMinutes = patch.intervalMinutes;
  if (patch.status !== undefined) alert.status = patch.status;
  if (patch.lastSymbols !== undefined) alert.lastSymbols = patch.lastSymbols;
  if (patch.lastRunAt !== undefined) alert.lastRunAt = patch.lastRunAt;
  if (patch.nextRunAt !== undefined) alert.nextRunAt = patch.nextRunAt;
  if (patch.lastFiredAt !== undefined) alert.lastFiredAt = patch.lastFiredAt;
  alert.updatedAt = new Date().toISOString();
  writeState(state);
  return alert;
}

export function deleteLocalScreenerAlert(alertId: string): boolean {
  const state = readState();
  const next = state.alerts.filter((row) => row.id !== alertId);
  if (next.length === state.alerts.length) return false;
  state.alerts = next;
  writeState(state);
  return true;
}

export function clearLocalScreenerAlertsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
