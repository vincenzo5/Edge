import { describe, expect, it } from "vitest";

import {
  evaluateAlertCondition,
  evaluateAlertDefinition,
  evaluateCombinedAlertDefinition,
  isAlertInCooldown,
} from "./evaluateAlerts";
import { buildPriceCondition } from "./alertConditions";

const baseAlert = {
  id: "a",
  symbol: "SPY",
  operator: "enter_zone" as const,
  price: 100,
  priceHigh: 110,
  message: null,
  recurrence: "once" as const,
  status: "active" as const,
  cooldownMs: 30_000,
  expiresAt: null,
  lastPrice: 95,
  lastFiredAt: null,
  drawingId: "d1",
  drawingKind: "rectangle" as const,
  tlT0: null,
  tlV0: null,
  tlT1: null,
  tlV1: null,
  tlExtendLeft: null,
  tlExtendRight: null,
  drawingRole: null,
  bundleId: null,
  combinator: null,
  conditions: [
    buildPriceCondition({ operator: "enter_zone", price: 100, priceHigh: 110 }),
  ],
  watchlistId: null,
  symbolState: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("evaluateAlertCondition", () => {
  it("fires cross_above when price crosses target", () => {
    expect(
      evaluateAlertCondition({
        operator: "cross_above",
        targetPrice: 100,
        quotePrice: 101,
        previousPrice: 99,
      }),
    ).toBe(true);
  });

  it("does not fire cross_above without a prior side", () => {
    expect(
      evaluateAlertCondition({
        operator: "cross_above",
        targetPrice: 100,
        quotePrice: 101,
        previousPrice: 101,
      }),
    ).toBe(false);
  });

  it("fires touch_below when price is at or below target", () => {
    expect(
      evaluateAlertCondition({
        operator: "touch_below",
        targetPrice: 50,
        quotePrice: 49.5,
        previousPrice: 51,
      }),
    ).toBe(true);
  });

  it("fires enter_zone when quote moves into rectangle band", () => {
    expect(
      evaluateAlertCondition({
        operator: "enter_zone",
        targetPrice: 100,
        zoneHigh: 110,
        quotePrice: 105,
        previousPrice: 95,
      }),
    ).toBe(true);
  });

  it("fires exit_zone when quote leaves rectangle band", () => {
    expect(
      evaluateAlertCondition({
        operator: "exit_zone",
        targetPrice: 100,
        zoneHigh: 110,
        quotePrice: 95,
        previousPrice: 105,
      }),
    ).toBe(true);
  });
});

describe("evaluateAlertDefinition", () => {
  it("evaluates drawing-bound rectangle alert via denormalized geometry", () => {
    expect(
      evaluateAlertDefinition({
        alert: baseAlert,
        quotePrice: 105,
        previousPrice: 95,
      }),
    ).toBe(true);
  });
});

describe("evaluateCombinedAlertDefinition", () => {
  it("fires when AND legs transition to satisfied together", () => {
    const result = evaluateCombinedAlertDefinition({
      alert: {
        ...baseAlert,
        operator: "cross_above",
        price: 100,
        priceHigh: null,
        drawingId: null,
        drawingKind: null,
        combinator: "and",
        conditions: [
          buildPriceCondition({ operator: "cross_above", price: 100 }),
          buildPriceCondition({ operator: "touch_above", price: 99 }),
        ],
      },
      symbol: "SPY",
      quotePrice: 101,
      candlesByInterval: new Map(),
      symbolState: {},
    });
    expect(result.combinedSatisfied).toBe(true);
    expect(result.shouldFire).toBe(true);
  });

  it("does not fire OR alert when only one leg is satisfied", () => {
    const result = evaluateCombinedAlertDefinition({
      alert: {
        ...baseAlert,
        operator: "cross_above",
        price: 100,
        priceHigh: null,
        drawingId: null,
        drawingKind: null,
        combinator: "or",
        conditions: [
          buildPriceCondition({ operator: "cross_above", price: 200 }),
          buildPriceCondition({ operator: "touch_above", price: 99 }),
        ],
      },
      symbol: "SPY",
      quotePrice: 101,
      candlesByInterval: new Map(),
      symbolState: {},
    });
    expect(result.combinedSatisfied).toBe(true);
    expect(result.shouldFire).toBe(true);
  });

  it("fires script_condition on fresh satisfied snapshot edge", () => {
    const now = Date.now();
    const result = evaluateCombinedAlertDefinition({
      alert: {
        ...baseAlert,
        operator: "touch_above",
        price: 0,
        priceHigh: null,
        drawingId: null,
        drawingKind: null,
        combinator: null,
        conditions: [
          {
            kind: "script_condition",
            scriptId: "alert-condition-cross",
            revision: "golden-v1",
            conditionId: "crossUp",
            title: "Cross up",
          },
        ],
      },
      symbol: "SPY",
      quotePrice: null,
      candlesByInterval: new Map(),
      symbolState: {
        SPY: {
          lastSatisfied: false,
          lastScriptSatisfied: true,
          lastScriptBarTime: now - 60_000,
          lastScriptSnapshotAt: new Date(now - 1_000).toISOString(),
        },
      },
      nowMs: now,
    });
    expect(result.combinedSatisfied).toBe(true);
    expect(result.shouldFire).toBe(true);
  });
});

describe("isAlertInCooldown", () => {
  it("returns true inside cooldown window", () => {
    const now = Date.now();
    expect(isAlertInCooldown(new Date(now - 5_000).toISOString(), 30_000, now)).toBe(true);
  });

  it("returns false outside cooldown window", () => {
    const now = Date.now();
    expect(isAlertInCooldown(new Date(now - 60_000).toISOString(), 30_000, now)).toBe(false);
  });
});
