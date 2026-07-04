import { describe, expect, it } from "vitest";
import { buildAccountSnapshot } from "./accountSnapshot";

describe("buildAccountSnapshot", () => {
  it("builds read model from provider payload", () => {
    const snapshot = buildAccountSnapshot("connected", false, null, {
      status: { connected: true, accountId: "DU123", updatedAt: 1000 },
      summary: { accountId: "DU123", tags: {}, updatedAt: 2000 },
      positions: [{ contract: { symbol: "AAPL" }, position: 10, updatedAt: 3000 }],
      pnl: null,
      orders: [],
      executions: [],
    });

    expect(snapshot.connectionState).toBe("connected");
    expect(snapshot.positions).toHaveLength(1);
    expect(snapshot.updatedAt).toBe(3000);
  });
});
