/**
 * Root redirect helpers shared by lastModule and entry policy — Phase 8.
 */

import type { DefaultResearchDensity } from "./defaultDensityPreference";

export type RootRedirectTarget = "/home" | "/workspace" | "/research" | "/copilot";

export function rootRedirectForDefaultDensity(
  density: DefaultResearchDensity,
): RootRedirectTarget {
  switch (density) {
    case "Talk":
      return "/copilot";
    case "Board":
      return "/research";
    case "Desk":
      return "/workspace";
  }
}
