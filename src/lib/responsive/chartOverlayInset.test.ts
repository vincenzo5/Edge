import { describe, expect, it } from "vitest";
import { chartOverlayRightInsetPx } from "./chartOverlayInset";

describe("chartOverlayRightInsetPx", () => {
  it("returns 0 when no panel is open", () => {
    expect(
      chartOverlayRightInsetPx({
        activePanel: null,
        isFloating: false,
        panelWidth: 360,
      }),
    ).toBe(0);
  });

  it("returns 0 when the panel is floating", () => {
    expect(
      chartOverlayRightInsetPx({
        activePanel: "risk",
        isFloating: true,
        panelWidth: 360,
      }),
    ).toBe(0);
  });

  it("returns panel width when a docked overlay panel is open", () => {
    expect(
      chartOverlayRightInsetPx({
        activePanel: "watchlist",
        isFloating: false,
        panelWidth: 360,
      }),
    ).toBe(360);
  });

  it("clamps negative widths to 0", () => {
    expect(
      chartOverlayRightInsetPx({
        activePanel: "account",
        isFloating: false,
        panelWidth: -10,
      }),
    ).toBe(0);
  });
});
