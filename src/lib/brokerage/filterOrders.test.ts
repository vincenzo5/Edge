import { describe, expect, it } from "vitest";
import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { filterOrdersByAccount } from "./filterOrders";

const orders: AccountOrder[] = [
  { orderId: 1, account: "DUP586813", symbol: "F" },
  { orderId: 2, account: "DU999999", symbol: "AAPL" },
  { orderId: 3, account: "DUP586813", symbol: "MSFT" },
];

describe("filterOrdersByAccount", () => {
  it("returns all orders when accountId is empty", () => {
    expect(filterOrdersByAccount(orders, null)).toEqual(orders);
    expect(filterOrdersByAccount(orders, "")).toEqual(orders);
  });

  it("filters orders to the requested account", () => {
    expect(filterOrdersByAccount(orders, "DUP586813")).toEqual([
      orders[0],
      orders[2],
    ]);
  });
});
