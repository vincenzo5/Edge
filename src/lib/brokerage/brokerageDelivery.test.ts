import { describe, expect, it } from "vitest";
import { buildBrokerageSubdatasetInputs } from "./brokerageDelivery";

describe("buildBrokerageSubdatasetInputs", () => {
  it("returns sanitized sub-rows without account identifiers in detail", () => {
    const rows = buildBrokerageSubdatasetInputs({
      snapshot: {
        status: { connectionState: "connected", accountId: "DU123" } as never,
        summary: { accountId: "DU123", updatedAt: 1_000 } as never,
        positions: [{ updatedAt: 2_000 } as never],
        pnl: { updatedAt: 3_000 } as never,
        orders: [{ updatedAt: 4_000 } as never],
        executions: [{ updatedAt: 5_000 } as never],
        updatedAt: 6_000,
      },
      ingestDetail: "ledger sync 2m ago",
    });

    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.datasetId)).toContain("account_summary");
    expect(JSON.stringify(rows)).not.toContain("DU123");
  });
});
