/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { generateCandles } from "../../examples/chart-perf-harness/src/generateCandles.js";
import { generateTrendLineDrawings } from "../../examples/chart-perf-harness/src/generateDrawings.js";
import { BROWSER_SCENARIOS } from "../../examples/chart-perf-harness/src/scenarios.js";

describe("chart perf harness scenarios", () => {
  it("includes resident-typical and stress interaction scenarios", () => {
    const resident = BROWSER_SCENARIOS.filter((scenario) => scenario.tag === "resident-typical");
    const stress = BROWSER_SCENARIOS.filter((scenario) => scenario.tag === "stress");

    expect(resident.some((scenario) => scenario.interaction === "crosshair-only")).toBe(true);
    expect(resident.some((scenario) => scenario.interaction === "tip-tick")).toBe(true);
    expect(resident.some((scenario) => scenario.drawingCount > 0)).toBe(true);
    expect(stress.some((scenario) => scenario.drawingCount > 0)).toBe(true);
  });

  it("builds valid trend line drawings from candles", () => {
    const candles = generateCandles(100);
    const drawings = generateTrendLineDrawings(candles, 5);

    expect(drawings).toHaveLength(5);
    for (const drawing of drawings) {
      expect(drawing.name).toBe("trend_line");
      expect(drawing.points).toHaveLength(2);
      expect(drawing.points[0]?.timestamp).toBeTypeOf("number");
      expect(drawing.points[1]?.timestamp).toBeTypeOf("number");
    }
  });
});
