import type {
  AlertCondition,
  AlertConditionCombinator,
  AlertDefinitionResponse,
} from "@/lib/persistence/schemas/alerts";
import type {
  AlertDrawingKind,
  AlertDrawingRole,
  AlertOperator,
  AlertRecurrence,
  AlertStatus,
  AlertSymbolState,
} from "@/lib/persistence/schemas/alerts";
import {
  buildPriceCondition,
  denormalizeFromConditions,
  expandCreateAlertInput,
  getSymbolStateEntry,
  syncPriceLegFromDenormalized,
} from "@/lib/alerts/alertConditions";

const STORAGE_KEY = "edge:alerts:v1";

type LocalAlertState = {
  version: 1;
  alerts: AlertDefinitionResponse[];
};

function readState(): LocalAlertState {
  if (typeof window === "undefined") {
    return { version: 1, alerts: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, alerts: [] };
    const parsed = JSON.parse(raw) as LocalAlertState;
    if (parsed.version !== 1 || !Array.isArray(parsed.alerts)) {
      return { version: 1, alerts: [] };
    }
    return parsed;
  } catch {
    return { version: 1, alerts: [] };
  }
}

function writeState(state: LocalAlertState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeStoredAlert(alert: AlertDefinitionResponse): AlertDefinitionResponse {
  const conditions =
    alert.conditions?.length > 0
      ? alert.conditions
      : [
          buildPriceCondition({
            operator: alert.operator,
            price: alert.price,
            priceHigh: alert.priceHigh,
          }),
        ];
  return {
    ...alert,
    conditions,
    combinator: alert.combinator ?? null,
    watchlistId: alert.watchlistId ?? null,
    symbolState: alert.symbolState ?? {},
  };
}

export function listLocalAlerts(): AlertDefinitionResponse[] {
  return [...readState().alerts]
    .map(normalizeStoredAlert)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalAlert(alertId: string): AlertDefinitionResponse | null {
  const alert = readState().alerts.find((row) => row.id === alertId);
  return alert ? normalizeStoredAlert(alert) : null;
}

export function listLocalAlertsByDrawingId(drawingId: string): AlertDefinitionResponse[] {
  return readState().alerts
    .filter((alert) => alert.drawingId === drawingId && alert.status !== "expired")
    .map(normalizeStoredAlert);
}

export type CreateLocalAlertInput = {
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

export function createLocalAlert(input: CreateLocalAlertInput): AlertDefinitionResponse {
  const expanded = expandCreateAlertInput(input);
  const now = new Date().toISOString();
  const alert: AlertDefinitionResponse = {
    id: crypto.randomUUID(),
    symbol: expanded.symbol,
    watchlistId: expanded.watchlistId,
    operator: expanded.operator,
    price: expanded.price,
    priceHigh: expanded.priceHigh,
    combinator: expanded.combinator,
    conditions: expanded.conditions,
    message: input.message?.trim() || null,
    recurrence: input.recurrence ?? "once",
    status: "active",
    cooldownMs: 30_000,
    expiresAt: null,
    lastPrice: null,
    lastFiredAt: null,
    drawingId: input.drawingId ?? null,
    drawingKind: input.drawingKind ?? null,
    tlT0: input.tlT0 ?? null,
    tlV0: input.tlV0 ?? null,
    tlT1: input.tlT1 ?? null,
    tlV1: input.tlV1 ?? null,
    tlExtendLeft: input.tlExtendLeft ?? null,
    tlExtendRight: input.tlExtendRight ?? null,
    drawingRole: input.drawingRole ?? null,
    bundleId: input.bundleId ?? null,
    symbolState: {},
    createdAt: now,
    updatedAt: now,
  };
  const state = readState();
  state.alerts = [alert, ...state.alerts];
  writeState(state);
  return alert;
}

export function updateLocalAlert(
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
    symbolState: AlertSymbolState;
  }>,
): AlertDefinitionResponse | null {
  const state = readState();
  const alert = state.alerts.find((row) => row.id === alertId);
  if (!alert) return null;

  const normalized = normalizeStoredAlert(alert);
  let nextConditions = normalized.conditions;

  if (patch.conditions !== undefined) nextConditions = patch.conditions;
  if (patch.combinator !== undefined) normalized.combinator = patch.combinator;
  if (patch.symbol !== undefined) {
    normalized.symbol = patch.symbol ? patch.symbol.trim().toUpperCase() : "*";
  }
  if (patch.watchlistId !== undefined) normalized.watchlistId = patch.watchlistId;

  if (
    patch.operator !== undefined ||
    patch.price !== undefined ||
    patch.priceHigh !== undefined
  ) {
    nextConditions = syncPriceLegFromDenormalized(nextConditions, {
      operator: patch.operator,
      price: patch.price,
      priceHigh: patch.priceHigh,
    });
    const denormalized = denormalizeFromConditions(nextConditions);
    normalized.operator = patch.operator ?? denormalized.operator;
    normalized.price = patch.price ?? denormalized.price;
    normalized.priceHigh =
      patch.priceHigh !== undefined ? patch.priceHigh : denormalized.priceHigh;
  } else if (patch.conditions !== undefined) {
    const denormalized = denormalizeFromConditions(nextConditions);
    normalized.operator = denormalized.operator;
    normalized.price = denormalized.price;
    normalized.priceHigh = denormalized.priceHigh;
  }

  normalized.conditions = nextConditions;
  if (patch.message !== undefined) normalized.message = patch.message?.trim() || null;
  if (patch.recurrence !== undefined) normalized.recurrence = patch.recurrence;
  if (patch.status !== undefined) normalized.status = patch.status;
  if (patch.expiresAt !== undefined) normalized.expiresAt = patch.expiresAt;
  if (patch.drawingId !== undefined) normalized.drawingId = patch.drawingId;
  if (patch.drawingKind !== undefined) normalized.drawingKind = patch.drawingKind;
  if (patch.tlT0 !== undefined) normalized.tlT0 = patch.tlT0;
  if (patch.tlV0 !== undefined) normalized.tlV0 = patch.tlV0;
  if (patch.tlT1 !== undefined) normalized.tlT1 = patch.tlT1;
  if (patch.tlV1 !== undefined) normalized.tlV1 = patch.tlV1;
  if (patch.tlExtendLeft !== undefined) normalized.tlExtendLeft = patch.tlExtendLeft;
  if (patch.tlExtendRight !== undefined) normalized.tlExtendRight = patch.tlExtendRight;
  if (patch.drawingRole !== undefined) normalized.drawingRole = patch.drawingRole;
  if (patch.bundleId !== undefined) normalized.bundleId = patch.bundleId;
  if (patch.symbolState !== undefined) normalized.symbolState = patch.symbolState;
  normalized.updatedAt = new Date().toISOString();

  const index = state.alerts.findIndex((row) => row.id === alertId);
  state.alerts[index] = normalized;
  writeState(state);
  return normalized;
}

export function deleteLocalAlert(alertId: string): boolean {
  const state = readState();
  const next = state.alerts.filter((row) => row.id !== alertId);
  if (next.length === state.alerts.length) return false;
  state.alerts = next;
  writeState(state);
  return true;
}

export function clearLocalAlertsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function applyLocalAlertSnapshot(
  alertId: string,
  input: { symbol: string; satisfied: boolean; barTime: number },
): AlertDefinitionResponse {
  const existing = getLocalAlert(alertId);
  if (!existing || existing.status !== "active") {
    throw new Error("Alert not found or snapshot not accepted.");
  }
  const hasScriptLeg = existing.conditions.some((condition) => condition.kind === "script_condition");
  if (!hasScriptLeg) {
    throw new Error("Alert not found or snapshot not accepted.");
  }
  const symbol = input.symbol.trim().toUpperCase();
  if (existing.symbol !== symbol) {
    throw new Error("Alert not found or snapshot not accepted.");
  }

  const symbolState = { ...(existing.symbolState ?? {}) };
  const entry = getSymbolStateEntry(symbolState, symbol);
  symbolState[symbol] = {
    ...entry,
    lastScriptSatisfied: input.satisfied,
    lastScriptBarTime: input.barTime,
    lastScriptSnapshotAt: new Date().toISOString(),
  };

  return updateLocalAlert(alertId, { symbolState })!;
}
