import { describe, expect, it } from "vitest";
import { riskPlanGapLabel, summarizeRiskPlanSlots } from "./summarizeRiskPlanSlots";

describe("summarizeRiskPlanSlots", () => {
  it("reports no_bind when nothing is bound", () => {
    const summary = summarizeRiskPlanSlots({
      bind: null,
      linked: false,
      boundLevels: null,
      manualEntry: null,
      manualStop: null,
      dollarRisk: 1000,
    });
    expect(summary.gaps).toContain("no_bind");
    expect(summary.bindLabel).toBeNull();
    expect(summary.canUseInTrade).toBe(false);
  });

  it("sizes from linked live levels and budget", () => {
    const summary = summarizeRiskPlanSlots({
      bind: { cellId: "cell-abc", drawingId: "draw-xyz" },
      linked: true,
      boundLevels: { entry: 100, stop: 95, direction: "long" },
      manualEntry: null,
      manualStop: null,
      dollarRisk: 500,
    });
    expect(summary.gaps).not.toContain("no_bind");
    expect(summary.gaps).not.toContain("unlinked");
    expect(summary.sizing.shares).toBe(100);
    expect(summary.sizing.plannedRiskDollars).toBe(500);
    expect(summary.bindLabel).toContain("Long");
    expect(summary.canUseInTrade).toBe(true);
  });

  it("flags unlinked override and still sizes from manual levels", () => {
    const summary = summarizeRiskPlanSlots({
      bind: { cellId: "cell-1", drawingId: "d1" },
      linked: false,
      boundLevels: { entry: 120, stop: 115, direction: "long" },
      manualEntry: 125,
      manualStop: 120,
      dollarRisk: 500,
    });
    expect(summary.gaps).toContain("unlinked");
    expect(summary.geometry.entry).toBe(125);
    expect(summary.geometry.stop).toBe(120);
    expect(summary.sizing.shares).toBe(100);
    expect(summary.canUseInTrade).toBe(true);
  });

  it("flags budget_unresolved in percent mode without account", () => {
    const summary = summarizeRiskPlanSlots({
      bind: { cellId: "cell-1", drawingId: "d1" },
      linked: true,
      boundLevels: { entry: 100, stop: 95, direction: "long" },
      manualEntry: null,
      manualStop: null,
      dollarRisk: null,
    });
    expect(summary.gaps).toContain("budget_unresolved");
    expect(summary.sizing.shares).toBeNull();
    expect(summary.canUseInTrade).toBe(false);
    expect(summary.useInTradeDisabledReason).toMatch(/budget/i);
  });

  it("flags invalid stop geometry", () => {
    const summary = summarizeRiskPlanSlots({
      bind: { cellId: "cell-1", drawingId: "d1" },
      linked: true,
      boundLevels: { entry: 100, stop: 100, direction: "long" },
      manualEntry: null,
      manualStop: null,
      dollarRisk: 500,
    });
    expect(summary.gaps).toContain("no_stop");
    expect(summary.canUseInTrade).toBe(false);
  });

  it("maps gap labels for sidebar display", () => {
    expect(riskPlanGapLabel("unlinked")).toMatch(/relink/i);
    expect(riskPlanGapLabel("budget_unresolved")).toMatch(/Budget/i);
  });
});
