import { describe, expect, it } from "vitest";

import {
  buildPriceCondition,
  combineConditionResults,
  denormalizeFromConditions,
  expandCreateAlertInput,
  formatConditionsSummary,
  shouldFireCombinedAlert,
  syncPriceLegFromDenormalized,
} from "./alertConditions";

describe("expandCreateAlertInput", () => {
  it("expands flat price fields into one price condition", () => {
    const expanded = expandCreateAlertInput({
      symbol: "aapl",
      operator: "cross_above",
      price: 150,
    });
    expect(expanded.symbol).toBe("AAPL");
    expect(expanded.conditions).toEqual([
      buildPriceCondition({ operator: "cross_above", price: 150, priceHigh: null }),
    ]);
    expect(expanded.combinator).toBeNull();
  });

  it("requires combinator for two conditions", () => {
    expect(() =>
      expandCreateAlertInput({
        symbol: "SPY",
        conditions: [
          buildPriceCondition({ operator: "cross_above", price: 100 }),
          buildPriceCondition({ operator: "touch_below", price: 90 }),
        ],
      }),
    ).toThrow(/combinator/);
  });

  it("uses star symbol for watchlist scope", () => {
    const expanded = expandCreateAlertInput({
      watchlistId: "wl-1",
      operator: "cross_above",
      price: 100,
    });
    expect(expanded.symbol).toBe("*");
    expect(expanded.watchlistId).toBe("wl-1");
  });
});

describe("combineConditionResults", () => {
  it("combines with AND", () => {
    expect(combineConditionResults([true, false], "and")).toBe(false);
    expect(combineConditionResults([true, true], "and")).toBe(true);
  });

  it("combines with OR", () => {
    expect(combineConditionResults([false, true], "or")).toBe(true);
    expect(combineConditionResults([false, false], "or")).toBe(false);
  });
});

describe("shouldFireCombinedAlert", () => {
  it("fires on false to true transition", () => {
    expect(shouldFireCombinedAlert(false, true)).toBe(true);
    expect(shouldFireCombinedAlert(undefined, true)).toBe(true);
    expect(shouldFireCombinedAlert(true, true)).toBe(false);
  });
});

describe("syncPriceLegFromDenormalized", () => {
  it("updates first price leg when denormalized fields change", () => {
    const next = syncPriceLegFromDenormalized(
      [
        buildPriceCondition({ operator: "cross_above", price: 100 }),
        buildPriceCondition({ operator: "touch_below", price: 90 }),
      ],
      { price: 105 },
    );
    expect(next[0]).toEqual(
      buildPriceCondition({ operator: "cross_above", price: 105, priceHigh: null }),
    );
    expect(denormalizeFromConditions(next).price).toBe(105);
  });
});

describe("formatConditionsSummary", () => {
  it("joins two legs with combinator", () => {
    const summary = formatConditionsSummary({
      combinator: "and",
      conditions: [
        buildPriceCondition({ operator: "cross_above", price: 100 }),
        buildPriceCondition({ operator: "touch_below", price: 90 }),
      ],
      operator: "cross_above",
      price: 100,
      priceHigh: null,
    });
    expect(summary).toContain("AND");
  });
});
