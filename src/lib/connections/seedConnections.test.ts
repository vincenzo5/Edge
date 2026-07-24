import { describe, expect, it, vi } from "vitest";

import { SEED_CONNECTIONS } from "./seedConnections";
import { ConnectionSchema } from "./types";

vi.mock("@/lib/trading/connectionRegistry", () => ({
  IB_PAPER_CONNECTION_ID: "ib-paper",
  IB_LIVE_CONNECTION_ID: "ib-live",
}));

describe("SEED_CONNECTIONS", () => {
  it("maps ib-paper and ib-live with local_gateway auth", () => {
    expect(SEED_CONNECTIONS).toHaveLength(2);
    expect(SEED_CONNECTIONS.map((row) => row.id)).toEqual(["ib-paper", "ib-live"]);
    for (const connection of SEED_CONNECTIONS) {
      expect(ConnectionSchema.safeParse(connection).success).toBe(true);
      expect(connection.authKind).toBe("local_gateway");
      expect(connection.kind).toBe("ib_gateway_sidecar");
    }
  });
});
