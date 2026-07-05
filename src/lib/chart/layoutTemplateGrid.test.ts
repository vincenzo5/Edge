import { describe, expect, it } from "vitest";

import { resolveLayoutGridStyles } from "./layoutTemplateGrid";
import { getLayoutTemplate } from "./layoutTemplates";
import { shouldStackLayout } from "@/lib/responsive/responsiveLayout";

describe("layoutTemplateGrid", () => {
  it("returns column/row tracks for rectangular templates", () => {
    const template = getLayoutTemplate("n4-grid-2x2");
    const { containerStyle, cellStyles, stacked } = resolveLayoutGridStyles(template, {
      stack: false,
    });

    expect(stacked).toBe(false);
    expect(containerStyle.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    expect(containerStyle.gridTemplateRows).toBe("repeat(2, minmax(0, 1fr))");
    expect(cellStyles).toHaveLength(4);
    expect(cellStyles[0]).toEqual({ gridColumn: "1 / span 1", gridRow: "1 / span 1" });
  });

  it("returns asymmetric placements for main-left templates", () => {
    const template = getLayoutTemplate("n3-main-left");
    const { cellStyles } = resolveLayoutGridStyles(template, { stack: false });

    expect(cellStyles[0]).toEqual({ gridColumn: "1 / span 1", gridRow: "1 / span 2" });
    expect(cellStyles[1]).toEqual({ gridColumn: "2 / span 1", gridRow: "1 / span 1" });
    expect(cellStyles[2]).toEqual({ gridColumn: "2 / span 1", gridRow: "2 / span 1" });
  });

  it("stacks multi-column templates into a single column", () => {
    const template = getLayoutTemplate("n2-cols");
    const { containerStyle, cellStyles, stacked } = resolveLayoutGridStyles(template, {
      stack: true,
    });

    expect(stacked).toBe(true);
    expect(containerStyle.gridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(containerStyle.gridTemplateRows).toBe("repeat(2, minmax(0, 1fr))");
    expect(cellStyles[0]).toEqual({ gridColumn: "1", gridRow: "1" });
    expect(cellStyles[1]).toEqual({ gridColumn: "1", gridRow: "2" });
  });

  it("respects custom stackOrder when stacking", () => {
    const template = {
      ...getLayoutTemplate("n2-cols"),
      stackOrder: [1, 0] as const,
    };
    const { cellStyles } = resolveLayoutGridStyles(template, { stack: true });

    expect(cellStyles[0]).toEqual({ gridColumn: "1", gridRow: "2" });
    expect(cellStyles[1]).toEqual({ gridColumn: "1", gridRow: "1" });
  });
});

describe("shouldStackLayout", () => {
  it("stacks when width is below minimum for column count", () => {
    const template = getLayoutTemplate("n2-cols");
    expect(shouldStackLayout(template, 639)).toBe(true);
    expect(shouldStackLayout(template, 640)).toBe(false);
  });

  it("does not stack single-column templates", () => {
    const template = getLayoutTemplate("n3-rows");
    expect(shouldStackLayout(template, 400)).toBe(false);
  });
});
