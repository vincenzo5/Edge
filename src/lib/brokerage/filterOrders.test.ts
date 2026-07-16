import { describe, expect, it } from "vitest";
import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import {
  filterOpenOrders,
  filterOrdersByAccount,
  sortOrdersNewestFirst,
} from "./filterOrders";

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

describe("filterOpenOrders", () => {
  it("keeps working and missing-status orders", () => {
    const rows: AccountOrder[] = [
      { orderId: 1, status: "Submitted", symbol: "F" },
      { orderId: 2, status: null, symbol: "AAPL" },
      { orderId: 3, status: "Cancelled", symbol: "MSFT" },
      { orderId: 4, status: "Filled", symbol: "TSLA" },
    ];
    expect(filterOpenOrders(rows).map((o) => o.orderId)).toEqual([1, 2]);
  });
});

describe("sortOrdersNewestFirst", () => {
  it("sorts by updatedAt descending", () => {
    const rows: AccountOrder[] = [
      { orderId: 1, updatedAt: 10 },
      { orderId: 2, updatedAt: 30 },
      { orderId: 3, updatedAt: 20 },
    ];
    expect(sortOrdersNewestFirst(rows).map((o) => o.orderId)).toEqual([2, 3, 1]);
  });
});
