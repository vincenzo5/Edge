import { describe, expect, it } from "vitest";
import {
  isOpenOrderStatus,
  isOrderCancellable,
  isTerminalOrderStatus,
} from "./orderStatus";

describe("order status helpers", () => {
  it("treats active and missing statuses as open/cancellable", () => {
    expect(isOpenOrderStatus("Submitted")).toBe(true);
    expect(isOpenOrderStatus("PreSubmitted")).toBe(true);
    expect(isOpenOrderStatus(null)).toBe(true);
    expect(isOpenOrderStatus(undefined)).toBe(true);
    expect(isOpenOrderStatus("")).toBe(true);
    expect(isOrderCancellable("Submitted")).toBe(true);
    expect(isOrderCancellable(null)).toBe(true);
  });

  it("treats terminal statuses as closed and not cancellable", () => {
    expect(isTerminalOrderStatus("Filled")).toBe(true);
    expect(isTerminalOrderStatus("Cancelled")).toBe(true);
    expect(isTerminalOrderStatus("ApiCancelled")).toBe(true);
    expect(isTerminalOrderStatus("Inactive")).toBe(true);
    expect(isOpenOrderStatus("Cancelled")).toBe(false);
    expect(isOrderCancellable("Filled")).toBe(false);
    expect(isOrderCancellable("Cancelled")).toBe(false);
  });
});
