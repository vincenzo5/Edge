import type { AlertDrawingKind, AlertOperator } from "@/lib/persistence/schemas/alerts";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";

export type AlertPrefill = {
  symbol: string;
  operator: AlertOperator;
  price: number;
  message?: string;
  drawingId?: string;
  drawingKind?: AlertDrawingKind;
  priceHigh?: number;
  tlT0?: number;
  tlV0?: number;
  tlT1?: number;
  tlV1?: number;
  tlExtendLeft?: boolean;
  tlExtendRight?: boolean;
  scriptId?: string;
  revision?: string;
  conditionId?: string;
  scriptTitle?: string;
};

function appendPrefillParams(search: URLSearchParams, prefill: AlertPrefill): void {
  search.set("symbol", prefill.symbol);
  search.set("alertPrice", String(prefill.price));
  search.set("alertOperator", prefill.operator);
  if (prefill.drawingId) search.set("alertDrawingId", prefill.drawingId);
  if (prefill.drawingKind) search.set("alertDrawingKind", prefill.drawingKind);
  if (prefill.priceHigh != null) search.set("alertPriceHigh", String(prefill.priceHigh));
  if (prefill.tlT0 != null) search.set("alertTlT0", String(prefill.tlT0));
  if (prefill.tlV0 != null) search.set("alertTlV0", String(prefill.tlV0));
  if (prefill.tlT1 != null) search.set("alertTlT1", String(prefill.tlT1));
  if (prefill.tlV1 != null) search.set("alertTlV1", String(prefill.tlV1));
  if (prefill.tlExtendLeft != null) search.set("alertTlExtendLeft", String(prefill.tlExtendLeft));
  if (prefill.tlExtendRight != null) search.set("alertTlExtendRight", String(prefill.tlExtendRight));
  if (prefill.scriptId) search.set("alertScriptId", prefill.scriptId);
  if (prefill.revision) search.set("alertScriptRevision", prefill.revision);
  if (prefill.conditionId) search.set("alertScriptConditionId", prefill.conditionId);
  if (prefill.scriptTitle) search.set("alertScriptTitle", prefill.scriptTitle);
}

export function buildAlertPrefillWorkspaceLink(prefill: AlertPrefill): string {
  const search = new URLSearchParams(buildWorkspaceDeepLink({ surface: "alerts" }).split("?")[1] ?? "");
  appendPrefillParams(search, prefill);
  return `/workspace?${search.toString()}`;
}

export function dispatchAlertPrefill(prefill: AlertPrefill): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("edge:alert-prefill", { detail: prefill }));
}

function parseOptionalNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseOptionalBoolean(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function resolveAlertPrefillFromSearchParams(
  params: URLSearchParams,
): AlertPrefill | undefined {
  const symbol = params.get("symbol")?.trim().toUpperCase();
  const priceRaw = params.get("alertPrice");
  if (!symbol || !priceRaw) return undefined;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return undefined;
  const operatorRaw = params.get("alertOperator");
  const operator =
    operatorRaw === "cross_below" ||
    operatorRaw === "touch_above" ||
    operatorRaw === "touch_below" ||
    operatorRaw === "enter_zone" ||
    operatorRaw === "exit_zone"
      ? operatorRaw
      : "cross_above";

  const drawingKindRaw = params.get("alertDrawingKind");
  const drawingKind =
    drawingKindRaw === "horizontal_line" ||
    drawingKindRaw === "trend_line" ||
    drawingKindRaw === "rectangle"
      ? drawingKindRaw
      : undefined;

  return {
    symbol,
    operator,
    price,
    drawingId: params.get("alertDrawingId")?.trim() || undefined,
    drawingKind,
    priceHigh: parseOptionalNumber(params.get("alertPriceHigh")),
    tlT0: parseOptionalNumber(params.get("alertTlT0")),
    tlV0: parseOptionalNumber(params.get("alertTlV0")),
    tlT1: parseOptionalNumber(params.get("alertTlT1")),
    tlV1: parseOptionalNumber(params.get("alertTlV1")),
    tlExtendLeft: parseOptionalBoolean(params.get("alertTlExtendLeft")),
    tlExtendRight: parseOptionalBoolean(params.get("alertTlExtendRight")),
    scriptId: params.get("alertScriptId")?.trim() || undefined,
    revision: params.get("alertScriptRevision")?.trim() || undefined,
    conditionId: params.get("alertScriptConditionId")?.trim() || undefined,
    scriptTitle: params.get("alertScriptTitle")?.trim() || undefined,
  };
}

export function buildScriptAlertPrefill(input: {
  symbol: string;
  scriptId: string;
  revision: string;
  conditionId: string;
  title?: string;
}): AlertPrefill {
  return {
    symbol: input.symbol.trim().toUpperCase(),
    operator: "touch_above",
    price: 0,
    scriptId: input.scriptId,
    revision: input.revision,
    conditionId: input.conditionId,
    scriptTitle: input.title,
  };
}

export function dispatchScriptAlertPrefill(
  input: Parameters<typeof buildScriptAlertPrefill>[0],
): void {
  dispatchAlertPrefill(buildScriptAlertPrefill(input));
}
