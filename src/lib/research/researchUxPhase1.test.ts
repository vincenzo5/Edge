import { describe, expect, it } from "vitest";

import { DESK_DENSITY_ROUTE } from "./density";
import {
  densityFromPathname,
  densityRouteFor,
  DENSITY_ROUTE_BY_DENSITY,
  isDensitySwitcherPath,
  lastModuleForDensity,
  PERMANENT_DENSITY_ORDER,
} from "./densityNav";
import { RESEARCH_ENTRY_ROUTES } from "./entryPolicy";

describe("research density navigation", () => {
  it("maps permanent densities to Phase 0 entry routes", () => {
    expect(DENSITY_ROUTE_BY_DENSITY.Talk).toBe(RESEARCH_ENTRY_ROUTES.copilot);
    expect(DENSITY_ROUTE_BY_DENSITY.Board).toBe(RESEARCH_ENTRY_ROUTES.research);
    expect(DENSITY_ROUTE_BY_DENSITY.Desk).toBe(DESK_DENSITY_ROUTE);
    expect(PERMANENT_DENSITY_ORDER).toEqual(["Talk", "Board", "Desk"]);
  });

  it("derives active density from pathname", () => {
    expect(densityFromPathname("/copilot")).toBe("Talk");
    expect(densityFromPathname("/research")).toBe("Board");
    expect(densityFromPathname("/workspace")).toBe("Desk");
    expect(densityFromPathname("/home")).toBeNull();
  });

  it("round-trips density routes", () => {
    for (const density of PERMANENT_DENSITY_ORDER) {
      expect(densityRouteFor(density)).toBe(DENSITY_ROUTE_BY_DENSITY[density]);
      expect(densityFromPathname(densityRouteFor(density))).toBe(density);
    }
  });

  it("records lastModule modules without changing root redirect policy", () => {
    expect(lastModuleForDensity("Talk")).toBe("copilot");
    expect(lastModuleForDensity("Board")).toBe("research");
    expect(lastModuleForDensity("Desk")).toBe("workspace");
  });

  it("limits density switcher to Talk/Board/Desk routes", () => {
    expect(isDensitySwitcherPath("/copilot")).toBe(true);
    expect(isDensitySwitcherPath("/research")).toBe(true);
    expect(isDensitySwitcherPath("/workspace")).toBe(true);
    expect(isDensitySwitcherPath("/home")).toBe(false);
  });
});
