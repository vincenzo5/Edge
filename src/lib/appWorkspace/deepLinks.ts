import type { SurfaceId, TileSurfaceState } from "./types";

export type WorkspaceDeepLinkParams = {
  surface: SurfaceId;
  screenerView?: TileSurfaceState["screenerView"];
  journalView?: TileSurfaceState["journalView"];
};

export function buildWorkspaceDeepLink(params: WorkspaceDeepLinkParams): string {
  const search = new URLSearchParams();
  search.set("surface", params.surface);
  if (params.screenerView) {
    search.set("screenerView", params.screenerView);
  }
  if (params.journalView) {
    search.set("journalView", params.journalView);
  }
  return `/workspace?${search.toString()}`;
}

export const WORKSPACE_SURFACE_LINKS = {
  chart: buildWorkspaceDeepLink({ surface: "chart" }),
  screener: buildWorkspaceDeepLink({ surface: "screener" }),
  /** @deprecated Use `screener` — unified screener surface */
  screenerReview: buildWorkspaceDeepLink({ surface: "screener" }),
  /** @deprecated Use `screener` */
  screenerScreens: buildWorkspaceDeepLink({ surface: "screener" }),
  /** @deprecated Use `screener` */
  screenerResults: buildWorkspaceDeepLink({ surface: "screener" }),
  /** @deprecated Use `screener` */
  screenerKeepers: buildWorkspaceDeepLink({ surface: "screener" }),
  journalDashboard: buildWorkspaceDeepLink({ surface: "journal", journalView: "dashboard" }),
  journalTrades: buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }),
  journalSettings: buildWorkspaceDeepLink({ surface: "journal", journalView: "settings" }),
} as const;
