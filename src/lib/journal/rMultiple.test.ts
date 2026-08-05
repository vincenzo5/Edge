import { describe, expect, it } from "vitest";

import {
  computeAggregateRStats,
  computeJournalDashboardRStats,
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

  it("computes dashboard R stats including max drawdown in R", () => {
    const stats = computeJournalDashboardRStats([
      {
        status: "closed",
        closedAt: "2026-06-01T16:00:00.000Z",
        netPnL: 100,
        plannedRiskUsd: 100,
      },
      {
        status: "closed",
        closedAt: "2026-06-02T16:00:00.000Z",
        netPnL: -200,
        plannedRiskUsd: 100,
      },
      {
        status: "closed",
        closedAt: "2026-06-03T16:00:00.000Z",
        netPnL: 50,
        plannedRiskUsd: 100,
      },
    ]);
    expect(stats.netR).toBe(-0.5);
    expect(stats.expectancyR).toBeCloseTo(-0.5 / 3);
    expect(stats.avgWinR).toBeCloseTo(0.75);
    expect(stats.avgLossR).toBe(-2);
    expect(stats.maxDdR).toBe(2);
    expect(stats.tradeCountWithR).toBe(3);
  });

  it("feeds R stats from position-plan derived planned risk", () => {
    const derivedRiskUsd = 50;
    const r = computeRMultiple({
      ...closedTrade,
      plannedRiskMode: "usd",
      plannedRiskValue: derivedRiskUsd,
      plannedRiskUsd: derivedRiskUsd,
    });
    expect(r).toBe(5);
    const stats = computeAggregateRStats([
      {
        status: "closed",
        netPnL: closedTrade.netPnL,
        plannedRiskUsd: derivedRiskUsd,
      },
    ]);
    expect(stats.tradeCountWithR).toBe(1);
    expect(stats.avgR).toBe(5);
  });
});
