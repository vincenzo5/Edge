import { describe, expect, it } from "vitest";

import {
  buildWorkspaceDeepLink,
  clearWorkspaceIngressLock,
  readWorkspaceIngressLock,
  workspacePathAfterIngress,
  writeWorkspaceIngressLock,
  WORKSPACE_SURFACE_LINKS,
} from "./deepLinks";

describe("appWorkspace deepLinks", () => {
  it("builds chart deep link", () => {
    expect(buildWorkspaceDeepLink({ surface: "chart" })).toBe("/workspace?surface=chart");
  });

  it("builds screener review deep link as screens ingress", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "screener", screenerView: "review" }),
    ).toBe("/workspace?surface=screener&screenerView=review");
  });

  it("builds journal trades deep link", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }),
    ).toBe("/workspace?surface=journal&journalView=trades");
  });

  it("builds journal open positions deep link", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "journal", journalView: "open" }),
    ).toBe("/workspace?surface=journal&journalView=open");
    expect(WORKSPACE_SURFACE_LINKS.journalOpen).toBe(
      "/workspace?surface=journal&journalView=open",
    );
  });

  it("builds scripts deep link with selected script", () => {
    expect(
      buildWorkspaceDeepLink({ surface: "scripts", selectedScriptId: "script-1" }),
    ).toBe("/workspace?surface=scripts&scriptId=script-1");
  });

  it("exports stable surface link constants", () => {
    expect(WORKSPACE_SURFACE_LINKS.chart).toBe("/workspace?surface=chart");
    expect(WORKSPACE_SURFACE_LINKS.screener).toBe("/workspace?surface=screener");
    expect(WORKSPACE_SURFACE_LINKS.scripts).toBe("/workspace?surface=scripts");
    expect(WORKSPACE_SURFACE_LINKS.expectancy).toBe("/workspace?surface=expectancy");
    expect(WORKSPACE_SURFACE_LINKS.screenerReview).toBe(
      "/workspace?surface=screener&screenerView=screens",
    );
    expect(WORKSPACE_SURFACE_LINKS.screenerKeepers).toBe(
      "/workspace?surface=screener&screenerView=screens",
    );
  });

  it("strips ingress params after consume but keeps unrelated keys", () => {
    expect(workspacePathAfterIngress(new URLSearchParams("surface=alerts"))).toBe("/workspace");
    expect(
      workspacePathAfterIngress(
        new URLSearchParams("surface=alerts&alertId=a1&scriptFixture=all"),
      ),
    ).toBe("/workspace?scriptFixture=all");
    expect(
      workspacePathAfterIngress(
        new URLSearchParams("surface=alerts&symbol=AAPL&alertPrice=100&alertOperator=cross_above"),
      ),
    ).toBe("/workspace");
  });

  it("tracks same-tab ingress lock for sticky surface queries", () => {
    clearWorkspaceIngressLock();
    expect(readWorkspaceIngressLock()).toBeNull();
    writeWorkspaceIngressLock("surface=alerts");
    expect(readWorkspaceIngressLock()).toBe("surface=alerts");
    clearWorkspaceIngressLock();
    expect(readWorkspaceIngressLock()).toBeNull();
  });
});
