import { describe, expect, it } from "vitest";

import { buildIngressSurfaceState } from "./page";

describe("buildIngressSurfaceState", () => {
  it("returns undefined when no view params are set", () => {
    expect(buildIngressSurfaceState(null, null)).toBeUndefined();
    expect(buildIngressSurfaceState("review", null)).toBeUndefined();
  });

  it("returns journal view when valid", () => {
    expect(buildIngressSurfaceState(null, "trades")).toEqual({ journalView: "trades" });
  });
});
