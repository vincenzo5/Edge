import { describe, expect, it } from "vitest";
import {
  colorForValue,
  formatColorValue,
  resolveColorDomain,
  rgbaFromHex,
} from "./colorScale";
import type { HeatMapColorConfig } from "./types";

const palette = {
  positive: "#22ab94",
  negative: "#f23645",
  neutral: "#787b86",
};

const divergingConfig: HeatMapColorConfig = {
  metric: "changePercent",
  scale: {
    kind: "diverging",
    domain: "fixed",
    min: -3,
    mid: 0,
    max: 3,
  },
  missing: "neutral",
};

describe("colorScale", () => {
  it("maps fixed diverging domain", () => {
    const domain = resolveColorDomain([1, -2, 0], divergingConfig.scale);
    expect(domain).toEqual({ min: -3, mid: 0, max: 3 });
  });

  it("returns positive color for gains", () => {
    const domain = resolveColorDomain([2], divergingConfig.scale);
    const color = colorForValue(2, divergingConfig, domain, palette);
    expect(color).toContain("rgba(34, 171, 148");
  });

  it("returns negative color for losses", () => {
    const domain = resolveColorDomain([-2], divergingConfig.scale);
    const color = colorForValue(-2, divergingConfig, domain, palette);
    expect(color).toContain("rgba(242, 54, 69");
  });

  it("returns neutral for null values", () => {
    const domain = resolveColorDomain([], divergingConfig.scale);
    const color = colorForValue(null, divergingConfig, domain, palette);
    expect(color).toContain("rgba(120, 123, 134");
  });

  it("formats change percent with sign", () => {
    expect(formatColorValue(1.23, "changePercent")).toBe("+1.23%");
    expect(formatColorValue(-0.5, "changePercent")).toBe("-0.50%");
  });

  it("converts hex to rgba", () => {
    expect(rgbaFromHex("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });
});
