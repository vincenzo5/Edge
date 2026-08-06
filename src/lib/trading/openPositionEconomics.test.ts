import { describe, expect, it } from "vitest";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import {
  computeOpenPositionEconomics,
  formatOpenPositionEconomicsLine,
  formatOpenRiskAccountMarginChip,
} from "./openPositionEconomics";
import type { OpenPositionProtectStop } from "./summarizeOpenPositionExits";

function position(overrides: Partial<AccountPosition> = {}): AccountPosition {
  return {
    contract: { symbol: "AAPL" },
    position: 10,
    avgCost: 150,
    marketPrice: 155,
    marketValue: 1550,
    unrealizedPNL: 50,
    ...overrides,
  };
}

const stopProtect: OpenPositionProtectStop = {
  kind: "stop",
  stopPrice: 140,
  trailAmount: null,
};

describe("computeOpenPositionEconomics", () => {
  it("computes stock STP economics with open R", () => {
    const economics = computeOpenPositionEconomics({
      position: position(),
      protectStop: stopProtect,
      netLiquidation: 100_000,
    });
    expect(economics.notional).toBe(1550);
    expect(economics.costBasis).toBe(1500);
    expect(economics.unrealizedPct).toBeCloseTo(50 / 1500);
    expect(economics.openRiskDollars).toBe(150);
    expect(economics.openR).toBeCloseTo(0.5);
    expect(economics.pctOfNlv).toBeCloseTo(1550 / 100_000);
    expect(economics.riskMissingReason).toBeNull();
  });

  it("derives notional from last when marketValue missing", () => {
    const economics = computeOpenPositionEconomics({
      position: position({ marketValue: undefined }),
      protectStop: stopProtect,
    });
    expect(economics.notional).toBe(1550);
  });

  it("computes trail risk without open R", () => {
    const economics = computeOpenPositionEconomics({
      position: position(),
      protectStop: { kind: "trail", stopPrice: null, trailAmount: 2.5 },
    });
    expect(economics.openRiskDollars).toBe(25);
    expect(economics.openR).toBeNull();
    expect(economics.riskMissingReason).toBeNull();
  });

  it("marks unprotected positions without implying zero risk", () => {
    const economics = computeOpenPositionEconomics({
      position: position(),
      protectStop: { kind: null, stopPrice: null, trailAmount: null },
    });
    expect(economics.openRiskDollars).toBeNull();
    expect(economics.openR).toBeNull();
    expect(economics.riskMissingReason).toBe("needs_stop");
  });

  it("applies contract multiplier for futures", () => {
    const economics = computeOpenPositionEconomics({
      position: position({
        position: 1,
        avgCost: 4000,
        marketPrice: 4100,
        marketValue: 205_000,
        contract: { symbol: "ES", multiplier: "50" },
      }),
      protectStop: { kind: "stop", stopPrice: 3900, trailAmount: null },
    });
    expect(economics.costBasis).toBe(200_000);
    expect(economics.openRiskDollars).toBe(10_000);
  });
});

describe("formatOpenPositionEconomicsLine", () => {
  it("formats full economics line with stop and NLV", () => {
    const economics = computeOpenPositionEconomics({
      position: position(),
      protectStop: stopProtect,
      netLiquidation: 100_000,
    });
    const line = formatOpenPositionEconomicsLine(economics);
    expect(line).toContain("Avg 150.00");
    expect(line).toContain("Last 155.00");
    expect(line).toContain("Notional");
    expect(line).toContain("Cost");
    expect(line).toContain("Risk");
    expect(line).toContain("0.5R");
    expect(line).toContain("1.6% NLV");
  });

  it("shows Risk dash when unprotected", () => {
    const economics = computeOpenPositionEconomics({
      position: position(),
      protectStop: { kind: null, stopPrice: null, trailAmount: null },
    });
    expect(formatOpenPositionEconomicsLine(economics)).toContain("Risk —");
  });
});

describe("formatOpenRiskAccountMarginChip", () => {
  it("formats excess and maint from summary tags", () => {
    const chip = formatOpenRiskAccountMarginChip({
      ExcessLiquidity: { tag: "ExcessLiquidity", value: "30000" },
      MaintMarginReq: { tag: "MaintMarginReq", value: "45000" },
    });
    expect(chip).toContain("Excess");
    expect(chip).toContain("Maint");
    expect(chip).toContain("30,000");
    expect(chip).toContain("45,000");
  });

  it("returns null when tags missing", () => {
    expect(formatOpenRiskAccountMarginChip(undefined)).toBeNull();
  });
});
