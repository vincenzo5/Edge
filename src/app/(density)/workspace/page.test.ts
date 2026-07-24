import { describe, expect, it } from "vitest";

import { workspacePathAfterIngress } from "@/lib/appWorkspace/deepLinks";

import { buildIngressSurfaceState } from "./page";

describe("buildIngressSurfaceState", () => {
  it("returns undefined when no view params are set", () => {
    expect(buildIngressSurfaceState(null, null)).toBeUndefined();
  });

  it("coerces legacy screener views to screens", () => {
    expect(buildIngressSurfaceState("review", null)).toEqual({ screenerView: "screens" });
    expect(buildIngressSurfaceState("keepers", null)).toEqual({ screenerView: "screens" });
    expect(buildIngressSurfaceState("results", null)).toEqual({ screenerView: "screens" });
    expect(buildIngressSurfaceState("screens", null)).toEqual({ screenerView: "screens" });
  });

  it("ignores invalid screener view", () => {
    expect(buildIngressSurfaceState("nope", null)).toBeUndefined();
  });

  it("returns journal view when valid", () => {
    expect(buildIngressSurfaceState(null, "trades")).toEqual({ journalView: "trades" });
  });
});

describe("workspace ingress consume-once", () => {
  it("clears sticky surface=alerts so refresh cannot reopen Alerts", () => {
    expect(workspacePathAfterIngress(new URLSearchParams("surface=alerts"))).toBe("/workspace");
  });
});
