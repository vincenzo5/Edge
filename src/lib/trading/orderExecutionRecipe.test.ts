import { describe, expect, it } from "vitest";

import {
  bracketEntryRejectReason,
  EntryOrderSchema,
  OrderExecutionRecipeSchema,
  supportsBracketAttach,
  tifOptionsForBracketParent,
} from "./orderExecutionRecipe";

describe("orderExecutionRecipe", () => {
  it("round-trips all eight order types", () => {
    const types = [
      "MKT",
      "LMT",
      "STP",
      "STP LMT",
      "TRAIL",
      "TRAIL LIMIT",
      "MOC",
      "LOC",
    ] as const;
    for (const orderType of types) {
      const base = {
        orderType,
        outsideRth: false,
        tif: "DAY" as const,
        allOrNone: false,
        usePriceMgmtAlgo: false,
      };
      const input =
        orderType === "STP LMT"
          ? { ...base, limitPrice: 100, stopPrice: 95 }
          : orderType === "LMT" || orderType === "LOC" || orderType === "TRAIL LIMIT"
          ? { ...base, limitPrice: 100, stopPrice: orderType === "TRAIL LIMIT" ? 95 : undefined }
          : orderType === "STP" || orderType === "TRAIL"
            ? { ...base, stopPrice: 95 }
            : base;
      const parsed = OrderExecutionRecipeSchema.parse(input);
      expect(parsed.orderType).toBe(orderType);
    }
  });

  it("parses legacy STP_LMT entry orders", () => {
    const parsed = EntryOrderSchema.parse({ type: "STP_LMT", limitPrice: 101 });
    expect(parsed.orderType).toBe("STP LMT");
    expect(parsed.limitPrice).toBe(101);
  });

  it("rejects invalid TIF for MOC", () => {
    const result = OrderExecutionRecipeSchema.safeParse({
      orderType: "MOC",
      tif: "GTC",
    });
    expect(result.success).toBe(false);
  });

  it("bracket parent matrix enables STP and STP LMT", () => {
    expect(supportsBracketAttach("STP")).toBe(true);
    expect(supportsBracketAttach("STP LMT")).toBe(true);
    expect(supportsBracketAttach("TRAIL")).toBe(false);
    expect(supportsBracketAttach("MOC")).toBe(false);
  });

  it("bracket TIF allowlist is DAY and GTC only", () => {
    expect(tifOptionsForBracketParent("MKT")).toEqual(["DAY", "GTC"]);
    expect(tifOptionsForBracketParent("STP")).toEqual(["DAY", "GTC"]);
  });

  it("reject reason when protect requested on unsupported parent", () => {
    expect(
      bracketEntryRejectReason({ orderType: "TRAIL", protectRequested: true }),
    ).toMatch(/not supported yet/i);
    expect(
      bracketEntryRejectReason({ orderType: "STP", protectRequested: true }),
    ).toBeNull();
  });
});
