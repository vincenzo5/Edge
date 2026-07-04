import { describe, expect, it } from "vitest";

import {
  clampFloatingGeometry,
  defaultFloatingGeometry,
  getPanelPresentation,
} from "./floatingPanelGeometry";

describe("floatingPanelGeometry", () => {
  it("defaults missing presentation to docked", () => {
    expect(getPanelPresentation({ activePanel: "watchlist" }, "watchlist")).toBe("docked");
    expect(
      getPanelPresentation({ activePanel: "options", presentation: { options: "floating" } }, "options"),
    ).toBe("floating");
  });

  it("returns per-panel floating defaults", () => {
    expect(defaultFloatingGeometry("options")).toEqual({
      x: 48,
      y: 48,
      width: 920,
      height: 560,
    });
  });

  it("clamps geometry to container bounds", () => {
    const clamped = clampFloatingGeometry(
      { x: -100, y: -100, width: 200, height: 200 },
      1000,
      800,
    );
    expect(clamped.x).toBeGreaterThanOrEqual(8);
    expect(clamped.y).toBeGreaterThanOrEqual(8);
    expect(clamped.width).toBeGreaterThanOrEqual(480);
    expect(clamped.height).toBeGreaterThanOrEqual(320);
  });
});
