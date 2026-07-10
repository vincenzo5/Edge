import { describe, expect, it } from "vitest";
import { isOrderCancellable } from "./orderStatus";

describe("isOrderCancellable", () => {
  it("allows active statuses", () => {
    expect(isOrderCancellable("Submitted")).toBe(true);
    expect(isOrderCancellable("PreSubmitted")).toBe(true);
  });

  it("blocks terminal statuses", () => {
    expect(isOrderCancellable("Filled")).toBe(false);
    expect(isOrderCancellable("Cancelled")).toBe(false);
    expect(isOrderCancellable("Inactive")).toBe(false);
  });
});
