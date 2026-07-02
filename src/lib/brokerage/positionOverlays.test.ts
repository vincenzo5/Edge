import { describe, expect, it } from "vitest";
import { buildPositionReferenceLines } from "./positionOverlays";
import type { AccountPosition } from "../marketData/contracts/brokerage";

describe("buildPositionReferenceLines", () => {
  it("returns avg-cost line with qty and pnl label", () => {
    const position: AccountPosition = {
      contract: { conId: 1, symbol: "AAPL" },
      position: 100,
      avgCost: 150.25,
      unrealizedPNL: 250.5,
    };
    const lines = buildPositionReferenceLines(position);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.price).toBe(150.25);
    expect(lines[0]?.label).toContain("Long 100");
    expect(lines[0]?.label).toContain("+250.50");
  });

  it("returns empty array when no avg cost", () => {
    expect(buildPositionReferenceLines(null)).toEqual([]);
    expect(
      buildPositionReferenceLines({
        contract: { symbol: "AAPL" },
        position: 10,
        avgCost: null,
      }),
    ).toEqual([]);
  });
});
