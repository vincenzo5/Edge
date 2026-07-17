import { describe, expect, it } from "vitest";

import { buildWorkspaceDeepLink, WORKSPACE_SURFACE_LINKS } from "./deepLinks";

describe("appWorkspace deepLinks", () => {
  it("builds chart deep link", () => {
    expect(buildWorkspaceDeepLink({ surface: "chart" })).toBe("/workspace?surface=chart");
  });

  it("builds screener review deep link", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "screener", screenerView: "review" }),
    ).toBe("/workspace?surface=screener&screenerView=review");
  });

  it("builds journal trades deep link", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }),
    ).toBe("/workspace?surface=journal&journalView=trades");
  });

  it("exports stable surface link constants", () => {
    expect(WORKSPACE_SURFACE_LINKS.chart).toBe("/workspace?surface=chart");
    expect(WORKSPACE_SURFACE_LINKS.screener).toBe("/workspace?surface=screener");
    expect(WORKSPACE_SURFACE_LINKS.screenerReview).toBe("/workspace?surface=screener");
  });
});
