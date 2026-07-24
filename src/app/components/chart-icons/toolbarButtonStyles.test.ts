import { describe, expect, it } from "vitest";
import { toolbarButtonStateClass } from "./toolbarButtonStyles";

describe("toolbarButtonStyles", () => {
  it("uses accent color for active rail buttons", () => {
    expect(toolbarButtonStateClass(true)).toContain("--edge-accent-blue");
    expect(toolbarButtonStateClass(true)).toContain("--edge-surface-active");
  });

  it("uses rail idle colors when inactive", () => {
    expect(toolbarButtonStateClass(false)).toContain("--edge-text-rail");
  });
});
