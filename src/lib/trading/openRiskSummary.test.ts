import { describe, expect, it } from "vitest";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import {
  countOpenPositions,
  formatOpenRiskChipLabel,
  formatSignedMoney,
  resolveOpenRiskUnrealized,
  sumPositionUnrealized,
} from "./openRiskSummary";

function position(
  symbol: string,
  qty: number,
  unrealizedPNL: number | null = null,
): AccountPosition {
  return {
    contract: { symbol },
    position: qty,
    unrealizedPNL,
    updatedAt: Date.now(),
  };
}

describe("openRiskSummary", () => {
  it("counts non-zero positions only", () => {
    expect(
      countOpenPositions([
        position("AAPL", 10, 5),
        position("BBD", 0, 0),
        position("SPY", -2, -3),
      ]),
    ).toBe(2);
  });

  it("prefers aggregate unrealized when present", () => {
    const rows = [position("AAPL", 10, 5)];
    expect(resolveOpenRiskUnrealized(rows, 42)).toBe(42);
    expect(resolveOpenRiskUnrealized(rows, null)).toBe(5);
  });

  it("sums row unrealized when aggregate missing", () => {
    expect(
      sumPositionUnrealized([
        position("AAPL", 10, 5),
        position("SPY", -2, -3),
      ]),
    ).toBe(2);
  });

  it("formats chip label with signed money", () => {
    expect(formatOpenRiskChipLabel(3, 420.12)).toMatch(/^3 open · \+\$/);
    expect(formatOpenRiskChipLabel(1, null)).toBe("1 open · —");
  });

  it("formats signed money", () => {
    expect(formatSignedMoney(12.5)).toMatch(/^\+\$/);
    expect(formatSignedMoney(-3.2)).toMatch(/^-\$/);
    expect(formatSignedMoney(null)).toBe("—");
  });
});
