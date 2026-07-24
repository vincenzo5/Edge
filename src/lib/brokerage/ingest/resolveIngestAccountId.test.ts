import { describe, expect, it } from "vitest";

import { resolveIngestAccountId } from "@/lib/brokerage/ingest/resolveIngestAccountId";
import type { BrokerageSnapshot } from "@/lib/brokerage/brokerageService";

function snapshot(partial: Partial<BrokerageSnapshot>): BrokerageSnapshot {
  return {
    status: null,
    summary: null,
    positions: [],
    pnl: null,
    orders: [],
    executions: [],
    updatedAt: Date.now(),
    ...partial,
  };
}

describe("resolveIngestAccountId", () => {
  it("prefers execution account over mis-pinned summary on live", () => {
    const accountId = resolveIngestAccountId(
      snapshot({
        summary: { accountId: "DUP586813", tags: {}, updatedAt: 1 },
        status: {
          enabled: true,
          connected: true,
          accountId: "DUP586813",
          managedAccounts: ["U25026894"],
          timestamp: 1,
        },
        executions: [
          {
            execId: "e1",
            account: "U25026894",
            shares: 1,
            price: 1,
            contract: { symbol: "F", secType: "STK" },
          },
        ],
      }),
      "live",
    );
    expect(accountId).toBe("U25026894");
  });

  it("falls back to position account when executions are empty", () => {
    const accountId = resolveIngestAccountId(
      snapshot({
        summary: { accountId: "DUP586813", tags: {}, updatedAt: 1 },
        positions: [
          {
            account: "U25026894",
            contract: { symbol: "F", secType: "STK", conId: 1 },
            position: 4,
          },
        ],
      }),
      "live",
    );
    expect(accountId).toBe("U25026894");
  });

  it("uses metadata when broker truth is unavailable", () => {
    const accountId = resolveIngestAccountId(
      snapshot({
        status: {
          enabled: true,
          connected: true,
          accountId: "DUP586813",
          managedAccounts: ["DUP586813"],
          timestamp: 1,
        },
      }),
      "paper",
    );
    expect(accountId).toBe("DUP586813");
  });
});
