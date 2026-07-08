import { describe, expect, it } from "vitest";
import {
  HOME_LAYOUT_BREAKPOINTS,
  HOME_LAYOUT_DIMENSIONS,
  homeLayoutShowsAppNav,
  resolveHomeLayoutMode,
} from "./homeLayout";

describe("homeLayout", () => {
  describe("resolveHomeLayoutMode", () => {
    it("classifies tri-pane at ultrawide widths", () => {
      expect(resolveHomeLayoutMode(2560)).toBe("tri-pane");
      expect(resolveHomeLayoutMode(5120)).toBe("tri-pane");
    });

    it("classifies dual-stack between 1920 and 2559", () => {
      expect(resolveHomeLayoutMode(2559)).toBe("dual-stack");
      expect(resolveHomeLayoutMode(1920)).toBe("dual-stack");
    });

    it("classifies dual-tabbed between 1440 and 1919", () => {
      expect(resolveHomeLayoutMode(1919)).toBe("dual-tabbed");
      expect(resolveHomeLayoutMode(1440)).toBe("dual-tabbed");
    });

    it("classifies main-drawer between 1024 and 1439", () => {
      expect(resolveHomeLayoutMode(1439)).toBe("main-drawer");
      expect(resolveHomeLayoutMode(1024)).toBe("main-drawer");
    });

    it("classifies hub below 1024", () => {
      expect(resolveHomeLayoutMode(1023)).toBe("hub");
      expect(resolveHomeLayoutMode(768)).toBe("hub");
      expect(resolveHomeLayoutMode(390)).toBe("hub");
    });

    it("applies hysteresis when shrinking from tri-pane", () => {
      expect(resolveHomeLayoutMode(2528, "tri-pane")).toBe("tri-pane");
      expect(resolveHomeLayoutMode(2527, "tri-pane")).toBe("dual-stack");
    });

    it("applies hysteresis when growing from hub", () => {
      expect(resolveHomeLayoutMode(1056, "hub")).toBe("main-drawer");
      expect(resolveHomeLayoutMode(1055, "hub")).toBe("hub");
    });
  });

  describe("homeLayoutShowsAppNav", () => {
    it("always shows app nav across home layout modes", () => {
      expect(homeLayoutShowsAppNav("tri-pane")).toBe(true);
      expect(homeLayoutShowsAppNav("main-drawer")).toBe(true);
      expect(homeLayoutShowsAppNav("hub")).toBe(true);
    });
  });

  it("encodes minimum width constants", () => {
    const { navRailWidth, chartsMin, sidePanelMin } = HOME_LAYOUT_DIMENSIONS;
    expect(navRailWidth + chartsMin + sidePanelMin * 2).toBeGreaterThan(HOME_LAYOUT_BREAKPOINTS.mainDrawer);
  });
});
