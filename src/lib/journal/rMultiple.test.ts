import { describe, expect, it } from "vitest";

import {
  computeAggregateRStats,
  computePlannedRiskUsd,
  computePositionNotional,
  computeRMultiple,
} from "@/lib/journal/rMultiple";

describe("rMultiple", () => {
  const closedTrade = {
    status: "closed" as const,
    avgEntry: 100,
    netQuantity: 10,
    secType: "STK",
    netPnL: 250,
  };

  it("computes STK notional", () => {
    expect(computePositionNotional(closedTrade)).toBe(1000);
  });

  it("computes planned risk in usd mode", () => {
    expect(computePlannedRiskUsd(closedTrade, "usd", 500)).toBe(500);
  });

  it("computes planned risk in pct mode", () => {
    expect(computePlannedRiskUsd(closedTrade, "pct", 5)).toBe(50);
  });

  it("computes R multiple for closed trade", () => {
    const r = computeRMultiple({
      ...closedTrade,
      plannedRiskMode: "usd",
      plannedRiskValue: 500,
      plannedRiskUsd: 500,
    });
    expect(r).toBe(0.5);
  });

  it("returns null R for open trade", () => {
    expect(
      computeRMultiple({
        ...closedTrade,
        status: "open",
        plannedRiskUsd: 500,
      }),
    ).toBeNull();
  });

  it("aggregates average R", () => {
    const stats = computeAggregateRStats([
      {
        status: "closed",
        netPnL: 100,
        plannedRiskUsd: 100,
      },
      {
        status: "closed",
        netPnL: -50,
        plannedRiskUsd: 100,
      },
    ]);
    expect(stats.tradeCountWithR).toBe(2);
    expect(stats.avgR).toBe(0.25);
  });
});
