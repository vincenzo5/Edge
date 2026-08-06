import { describe, expect, it } from "vitest";

import {
  applyInitialStopPlannedRisk,
  derivePlannedRiskFromStop,
  isValidStopForDirection,
  resolveTradeRiskQuantity,
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

  it("resolveTradeRiskQuantity sums open-role fills when netQuantity is zero", () => {
    expect(
      resolveTradeRiskQuantity({
        direction: "long",
        netQuantity: 0,
        fills: [
          { quantity: 50, role: "open" },
          { quantity: 50, role: "close" },
        ],
      }),
    ).toBe(50);
  });

  it("resolveTradeRiskQuantity does not use max single fill for bare quantities", () => {
    expect(
      resolveTradeRiskQuantity({
        direction: "long",
        netQuantity: 0,
        fillQuantities: [50, 50],
      }),
    ).toBeNull();
  });

  it("resolveTradeRiskQuantity sums entry-side fills for LQDA-shaped round trip", () => {
    expect(
      resolveTradeRiskQuantity({
        direction: "long",
        netQuantity: 0,
        fills: [
          { quantity: 100, side: "BOT" },
          { quantity: 100, side: "BOT" },
          { quantity: 100, side: "BOT" },
          { quantity: 100, side: "BOT" },
          { quantity: 198, side: "SLD" },
          { quantity: 122, side: "SLD" },
          { quantity: 80, side: "SLD" },
        ],
      }),
    ).toBe(400);
  });

  it("resolveTradeRiskQuantity prefers positive netQuantity (closed open-size)", () => {
    expect(
      resolveTradeRiskQuantity({
        direction: "long",
        netQuantity: 400,
        fills: [
          { quantity: 198, role: "close" },
          { quantity: 122, role: "close" },
        ],
      }),
    ).toBe(400);
  });

  it("applyInitialStopPlannedRisk uses fill quantities for closed short trades", () => {
    const applied = applyInitialStopPlannedRisk(
      {
        direction: "short",
        avgEntry: 308.43,
        netQuantity: 0,
        fills: [
          { quantity: 25, role: "open", side: "SLD" },
          { quantity: 25, role: "close", side: "BOT" },
        ],
      },
      312,
    );
    expect(applied.initialStop).toBe(312);
    expect(applied.plannedRiskMode).toBe("usd");
    expect(applied.plannedRiskValue).toBeCloseTo(89.25, 2);
    expect(applied.plannedRiskUsd).toBeCloseTo(89.25, 2);
  });

  it("LQDA stop 77.57 on 400 shares yields ~$2400 risk", () => {
    const applied = applyInitialStopPlannedRisk(
      {
        direction: "long",
        avgEntry: 83.57,
        netQuantity: 400,
      },
      77.57,
    );
    expect(applied.plannedRiskUsd).toBeCloseTo(2400, 0);
  });
});
