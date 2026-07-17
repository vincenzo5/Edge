import { describe, expect, it } from "vitest";

import {
  parseAccountSummaryMetrics,
  shouldCaptureSnapshot,
} from "@/lib/brokerage/ingest/parseAccountSummary";

describe("parseAccountSummary", () => {
  it("reads IB summary tags into metrics", () => {
    const metrics = parseAccountSummaryMetrics({
      accountId: "DU123",
      tags: {
        NetLiquidation: { tag: "NetLiquidation", value: "100000" },
        TotalCashValue: { tag: "TotalCashValue", value: "25000" },
        BuyingPower: { tag: "BuyingPower", value: "40000" },
        GrossPositionValue: { tag: "GrossPositionValue", value: "75000" },
      },
      updatedAt: Date.now(),
    });
    expect(metrics.accountId).toBe("DU123");
    expect(metrics.netLiquidation).toBe(100_000);
    expect(metrics.cash).toBe(25_000);
    expect(metrics.buyingPower).toBe(40_000);
    expect(metrics.grossPositionValue).toBe(75_000);
  });

  it("throttles snapshot capture by interval", () => {
    const now = Date.now();
    const recent = new Date(now - 60_000);
    expect(shouldCaptureSnapshot(recent, now, 5 * 60_000)).toBe(false);
    expect(shouldCaptureSnapshot(null, now, 5 * 60_000)).toBe(true);
  });
});
