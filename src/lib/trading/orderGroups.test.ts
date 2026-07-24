import { describe, expect, it } from "vitest";
import { groupAccountOrders } from "./orderGroups";

describe("groupAccountOrders", () => {
  it("groups bracket children under parent", () => {
    const groups = groupAccountOrders([
      { orderId: 1, symbol: "AAPL", parentId: null },
      { orderId: 2, symbol: "AAPL", parentId: 1 },
      { orderId: 3, symbol: "AAPL", parentId: 1 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe("bracket");
    if (groups[0]?.kind === "bracket") {
      expect(groups[0].entry.orderId).toBe(1);
      expect(groups[0].children).toHaveLength(2);
    }
  });

  it("groups standalone OCA peers", () => {
    const groups = groupAccountOrders([
      { orderId: 10, symbol: "MSFT", ocaGroup: "grp-1" },
      { orderId: 11, symbol: "MSFT", ocaGroup: "grp-1" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe("oco");
  });
});
