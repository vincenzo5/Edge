/**
 * Research UX density navigation — Phase 1 wiring for Talk / Board / Desk chrome.
 */

import type { AppModule } from "@/lib/app/lastModule";

import { DESK_DENSITY_ROUTE } from "./density";
import { RESEARCH_ENTRY_ROUTES } from "./entryPolicy";

export const PERMANENT_DENSITY_ORDER = ["Talk", "Board", "Desk"] as const;

export type PermanentResearchDensity = (typeof PERMANENT_DENSITY_ORDER)[number];

export const DENSITY_ROUTE_BY_DENSITY: Record<PermanentResearchDensity, string> = {
  Talk: RESEARCH_ENTRY_ROUTES.copilot,
  Board: RESEARCH_ENTRY_ROUTES.research,
  Desk: DESK_DENSITY_ROUTE,
};

const DENSITY_BY_ROUTE: Record<string, PermanentResearchDensity> = {
  [RESEARCH_ENTRY_ROUTES.copilot]: "Talk",
  [RESEARCH_ENTRY_ROUTES.research]: "Board",
  [DESK_DENSITY_ROUTE]: "Desk",
};

export function densityRouteFor(density: PermanentResearchDensity): string {
  return DENSITY_ROUTE_BY_DENSITY[density];
}

export function densityFromPathname(pathname: string): PermanentResearchDensity | null {
  return DENSITY_BY_ROUTE[pathname] ?? null;
}

export function isDensitySwitcherPath(pathname: string): boolean {
  return densityFromPathname(pathname) != null;
}

export function lastModuleForDensity(density: PermanentResearchDensity): AppModule {
  switch (density) {
    case "Talk":
      return "copilot";
    case "Board":
      return "research";
    case "Desk":
      return "workspace";
  }
}
