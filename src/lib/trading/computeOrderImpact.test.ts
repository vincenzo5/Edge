import { describe, expect, it } from "vitest";
import {
  computeOrderImpactEconomics,
  formatOrderImpactMoney,
  formatOrderImpactRatio,
} from "./computeOrderImpact";

describe("computeOrderImpactEconomics", () => {
  it("computes notional from qty × entry", () => {
    const result = computeOrderImpactEconomics({
      quantity: 5,
      executableEntry: 100,
      stop: null,
      target: null,
      protectionEnabled: false,
    });
    expect(result.notional).toBe(500);
    expect(result.riskMissingReason).toBe("needs_stop");
    expect(result.rewardVisible).toBe(false);
    expect(result.rrVisible).toBe(false);
  });

  it("never implies zero risk when unprotected", () => {
    const result = computeOrderImpactEconomics({
      quantity: 10,
      executableEntry: 50,
      stop: 45,
      target: 60,
      protectionEnabled: false,
    });
    expect(result.riskDollars).toBeNull();
    expect(result.riskMissingReason).toBe("needs_stop");
    expect(result.rewardVisible).toBe(false);
  });

  it("computes risk, reward, and R:R when protect levels exist", () => {
    const result = computeOrderImpactEconomics({
      quantity: 10,
      executableEntry: 100,
      stop: 95,
      target: 110,
      protectionEnabled: true,
    });
    expect(result.notional).toBe(1000);
    expect(result.riskDollars).toBe(50);
    expect(result.rewardDollars).toBe(100);
    expect(result.riskRewardRatio).toBe(2);
    expect(result.riskMissingReason).toBeNull();
    expect(result.rewardVisible).toBe(true);
    expect(result.rrVisible).toBe(true);
  });

  it("hides reward and R:R when target is missing", () => {
    const result = computeOrderImpactEconomics({
      quantity: 10,
      executableEntry: 100,
      stop: 95,
      target: null,
      protectionEnabled: true,
    });
    expect(result.riskDollars).toBe(50);
    expect(result.rewardVisible).toBe(false);
    expect(result.rrVisible).toBe(false);
  });
});

describe("formatOrderImpactMoney / ratio", () => {
  it("formats money and ratio with dash for missing", () => {
    expect(formatOrderImpactMoney(1234.5)).toContain("1,234.50");
    expect(formatOrderImpactMoney(null)).toBe("—");
    expect(formatOrderImpactRatio(2)).toBe("1:2.0");
    expect(formatOrderImpactRatio(null)).toBe("—");
  });
});
