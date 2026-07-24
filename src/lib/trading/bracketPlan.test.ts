import { describe, expect, it } from "vitest";
import {
  buildBracketPlanFromLevels,
  buildFixedStopLeg,
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
});
