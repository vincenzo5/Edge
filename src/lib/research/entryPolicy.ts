/**
 * Entry policy stub — Phase 0 contract (no lastModule redirect changes yet).
 * Phase 8 extends smart `/` and user default-density preference.
 */

import { DESK_DENSITY_ROUTE } from "./density";

export const RESEARCH_ENTRY_ROUTES = {
  root: "/",
  home: "/home",
  copilot: "/copilot",
  workspace: DESK_DENSITY_ROUTE,
  /** Planned Talk/Board host — reserved; not routed in Phase 0. */
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
  /** Phase 0: documented only — no forced redirect from this route. */
  phase0Behavior: string;
};

/** Typed map of route roles — entry policy frozen for later phases. */
export const RESEARCH_ENTRY_POLICY: readonly ResearchEntryRouteDescriptor[] = [
  {
    path: RESEARCH_ENTRY_ROUTES.root,
    role: "smartRedirect",
    density: "none",
    phase0Behavior: "Existing lastModule redirect unchanged — /home or /workspace only",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.home,
    role: "moduleHub",
    density: "none",
    phase0Behavior: "Module hub cards unchanged; Desk remains one click away",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.copilot,
    role: "talkHost",
    density: "Talk",
    phase0Behavior: "Copilot page/sidebar/tile — primary Talk surface today",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.workspace,
    role: "deskHost",
    density: "Desk",
    phase0Behavior: "Tiled Desk — permanent density; behavior unchanged",
  },
  {
    path: RESEARCH_ENTRY_ROUTES.research,
    role: "researchHost",
    density: "Board",
    phase0Behavior: "Board stub shell — spatial cards deferred; root lastModule unchanged until Phase 8",
  },
];

export function entryPolicyForPath(path: string): ResearchEntryRouteDescriptor | undefined {
  return RESEARCH_ENTRY_POLICY.find((entry) => entry.path === path);
}
