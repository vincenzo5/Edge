/**
 * Entry policy — Phase 8 smart `/` + density route roles.
 */

import type { RootRedirectTarget } from "./rootRedirect";

import { DESK_DENSITY_ROUTE } from "./density";
import type { DefaultResearchDensity } from "./defaultDensityPreference";
import { rootRedirectForDefaultDensity } from "./rootRedirect";

export const RESEARCH_ENTRY_ROUTES = {
  root: "/",
  home: "/home",
  copilot: "/copilot",
  workspace: DESK_DENSITY_ROUTE,
  research: "/research",
} as const;

export type ResearchEntryRouteKey = keyof typeof RESEARCH_ENTRY_ROUTES;

export type ResearchEntryRouteRole =
  | "smartRedirect"
  | "moduleHub"
  | "talkHost"
  | "deskHost"
  | "researchHost";

export type ResearchEntryRouteDescriptor = {
  path: (typeof RESEARCH_ENTRY_ROUTES)[ResearchEntryRouteKey];
  role: ResearchEntryRouteRole;
  density: "Talk" | "Board" | "Desk" | "none";
  redirectBehavior: string;
};

/** Typed map of route roles — entry policy for Phase 8. */
export const RESEARCH_ENTRY_POLICY: readonly ResearchEntryRouteDescriptor[] = [
  {
    path: RESEARCH_ENTRY_ROUTES.root,
    role: "smartRedirect",
    density: "none",
    redirectBehavior:
      "Recent lastModule wins; cold/expired falls back to default density pref (Talk/Board/Desk)",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.home,
    role: "moduleHub",
    density: "none",
    redirectBehavior: "Module hub cards; Research Session + Desk remain one click away",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.copilot,
    role: "talkHost",
    density: "Talk",
    redirectBehavior: "Copilot page/sidebar/tile — primary Talk surface",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.workspace,
    role: "deskHost",
    density: "Desk",
    redirectBehavior: "Tiled Desk — permanent density; behavior unchanged",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.research,
    role: "researchHost",
    density: "Board",
    redirectBehavior: "Spatial Research Board — session cards + reel at /research",
  },
];

export function entryPolicyForPath(path: string): ResearchEntryRouteDescriptor | undefined {
  return RESEARCH_ENTRY_POLICY.find((entry) => entry.path === path);
}

export function resolveEntryPolicyRootRedirect(
  defaultDensity: DefaultResearchDensity,
): RootRedirectTarget {
  return rootRedirectForDefaultDensity(defaultDensity);
}
