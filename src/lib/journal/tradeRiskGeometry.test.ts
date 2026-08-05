import { describe, expect, it } from "vitest";

import {
  applyInitialStopPlannedRisk,
  derivePlannedRiskFromStop,
  isValidStopForDirection,
  validateInitialStop,
} from "@/lib/journal/tradeRiskGeometry";

describe("tradeRiskGeometry", () => {
  it("validates long stop below entry", () => {
    expect(isValidStopForDirection("long", 150, 145)).toBe(true);
    expect(isValidStopForDirection("long", 150, 155)).toBe(false);
    expect(validateInitialStop("long", 150, 145)).toBeNull();
    expect(validateInitialStop("long", 150, 155)).toBe(
      "For long trades, stop must be below entry.",
    );
  });

  it("validates short stop above entry", () => {
    expect(isValidStopForDirection("short", 150, 155)).toBe(true);
    expect(validateInitialStop("short", 150, 145)).toBe(
      "For short trades, stop must be above entry.",
    );
  });

  it("derives planned risk dollars from entry, stop, and qty", () => {
    expect(derivePlannedRiskFromStop({ entry: 150.25, initialStop: 145, qty: 100 })).toEqual({
      mode: "usd",
      value: 525,
      usd: 525,
    });
  });

  it("applyInitialStopPlannedRisk clears planned risk when stop cleared", () => {
    expect(
      applyInitialStopPlannedRisk(
        { direction: "long", avgEntry: 150, netQuantity: 100 },
        null,
      ),
    ).toEqual({
      initialStop: null,
      plannedRiskMode: null,
      plannedRiskValue: null,
      plannedRiskUsd: null,
    });
  });

  it("applyInitialStopPlannedRisk writes usd planned risk from geometry", () => {
    expect(
      applyInitialStopPlannedRisk(
        { direction: "long", avgEntry: 150, netQuantity: 10 },
        145,
      ),
    ).toEqual({
      initialStop: 145,
      plannedRiskMode: "usd",
      plannedRiskValue: 50,
      plannedRiskUsd: 50,
    });
  });
});
