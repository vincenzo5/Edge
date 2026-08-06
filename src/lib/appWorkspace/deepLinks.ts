import type { SurfaceId, TileSurfaceState } from "./types";

export type WorkspaceDeepLinkParams = {
  surface: SurfaceId;
  screenerView?: TileSurfaceState["screenerView"];
  journalView?: TileSurfaceState["journalView"];
  selectedScriptId?: TileSurfaceState["selectedScriptId"];
  selectedAlertId?: TileSurfaceState["selectedAlertId"];
};

/** Query keys consumed by workspace surface ingress (cleared after one apply). */
export const WORKSPACE_INGRESS_PARAM_KEYS = [
  "surface",
  "screenerView",
  "journalView",
  "scriptId",
  "alertId",
  "symbol",
  "alertPrice",
  "alertOperator",
  "alertDrawingId",
  "alertDrawingKind",
  "alertPriceHigh",
  "alertTlT0",
  "alertTlV0",
  "alertTlT1",
  "alertTlV1",
  "alertTlExtendLeft",
  "alertTlExtendRight",
  "alertScriptId",
  "alertScriptRevision",
  "alertScriptConditionId",
  "alertScriptTitle",
] as const;

export function buildWorkspaceDeepLink(params: WorkspaceDeepLinkParams): string {
  const search = new URLSearchParams();
  search.set("surface", params.surface);
  if (params.screenerView) {
    search.set("screenerView", params.screenerView);
  }
  if (params.journalView) {
    search.set("journalView", params.journalView);
  }
  if (params.selectedScriptId) {
    search.set("scriptId", params.selectedScriptId);
  }
  if (params.selectedAlertId) {
    search.set("alertId", params.selectedAlertId);
  }
  return `/workspace?${search.toString()}`;
}

/** Path after one-shot ingress — drops surface/prefill keys, keeps e.g. `scriptFixture`. */
export function workspacePathAfterIngress(search: URLSearchParams): string {
  const next = new URLSearchParams(search.toString());
  const preserveSymbolForJournalChart = next.has("journalTrade");
  for (const key of WORKSPACE_INGRESS_PARAM_KEYS) {
    if (key === "symbol" && preserveSymbolForJournalChart) continue;
    next.delete(key);
  }
  const qs = next.toString();
  return qs ? `/workspace?${qs}` : "/workspace";
}

const INGRESS_LOCK_KEY = "edge:workspace-ingress-lock";

/** Same-tab lock so a sticky `?surface=` cannot reopen a closed tile after refresh. */
export function readWorkspaceIngressLock(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(INGRESS_LOCK_KEY);
  } catch {
    return null;
  }
}

export function writeWorkspaceIngressLock(searchKey: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(INGRESS_LOCK_KEY, searchKey);
  } catch {
    // ignore quota / private mode
  }
}

export function clearWorkspaceIngressLock(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(INGRESS_LOCK_KEY);
  } catch {
    // ignore
  }
}

/** Drop sticky ingress query keys from the current location (close / Done / consume). */
export function clearWorkspaceIngressFromLocation(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.pathname !== "/workspace") return;
  let changed = false;
  for (const key of WORKSPACE_INGRESS_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
  clearWorkspaceIngressLock();
}

export const WORKSPACE_SURFACE_LINKS = {
  chart: buildWorkspaceDeepLink({ surface: "chart" }),
  screener: buildWorkspaceDeepLink({ surface: "screener" }),
  scripts: buildWorkspaceDeepLink({ surface: "scripts" }),
  alerts: buildWorkspaceDeepLink({ surface: "alerts" }),
  copilot: buildWorkspaceDeepLink({ surface: "copilot" }),
  expectancy: buildWorkspaceDeepLink({ surface: "expectancy" }),
  screenerReview: buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
  screenerScreens: buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
  screenerResults: buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
  screenerKeepers: buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
  journalDashboard: buildWorkspaceDeepLink({ surface: "journal", journalView: "dashboard" }),
  journalTrades: buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }),
  journalOpen: buildWorkspaceDeepLink({ surface: "journal", journalView: "open" }),
  journalSettings: buildWorkspaceDeepLink({ surface: "journal", journalView: "settings" }),
} as const;
