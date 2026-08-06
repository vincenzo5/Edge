import { describe, expect, it } from "vitest";
import {
  buildBracketPlanFromLevels,
  buildBracketPlanWithPrices,
  buildFixedStopLeg,
  resolveBracketExitQuantities,
  validateBracketGeometry,
} from "./bracketPlan";

describe("bracketPlan", () => {
  it("builds long bracket from plan levels", () => {
    const plan = buildBracketPlanFromLevels({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        orderType: "MKT",
        environment: "paper",
        outsideRth: true,
        tif: "DAY",
      },
      planLevels: {
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      },
    });
    expect(plan.stopLeg.stopPrice).toBe(95);
    expect(plan.takeProfitPrice).toBe(110);
    expect(validateBracketGeometry(plan)).toBeNull();
  });

  it("defaults exit quantities to entry size", () => {
    const plan = buildBracketPlanWithPrices({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 200,
        orderType: "MKT",
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      stopPrice: 95,
      takeProfitPrice: 105,
    });
    expect(resolveBracketExitQuantities(plan)).toEqual({
      takeProfitQuantity: 200,
      stopQuantity: 200,
    });
  });

  it("supports split exit quantities", () => {
    const plan = buildBracketPlanWithPrices({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 200,
        orderType: "MKT",
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      stopPrice: 95,
      takeProfitPrice: 105,
      takeProfitQuantity: 100,
      stopQuantity: 200,
    });
    expect(resolveBracketExitQuantities(plan)).toEqual({
      takeProfitQuantity: 100,
      stopQuantity: 200,
    });
  });

  it("rejects invalid long geometry", () => {
    const plan = buildBracketPlanFromLevels({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        orderType: "MKT",
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      planLevels: {
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 90,
        riskRewardRatio: null,
      },
      stopLeg: buildFixedStopLeg(95),
    });
    expect(validateBracketGeometry(plan)).toMatch(/above stop/i);
  });

  it("supports STP bracket parent entry", () => {
    const plan = buildBracketPlanWithPrices({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        orderType: "STP",
        stopPrice: 99,
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      stopPrice: 95,
      takeProfitPrice: 110,
    });
    expect(plan.entry.orderType).toBe("STP");
    expect(validateBracketGeometry(plan)).toBeNull();
  });

  it("supports stop-only bracket without take profit", () => {
    const plan = buildBracketPlanWithPrices({
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        orderType: "MKT",
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      stopPrice: 95,
    });
    expect(plan.takeProfitPrice).toBeUndefined();
    expect(validateBracketGeometry(plan)).toBeNull();
  });
});
