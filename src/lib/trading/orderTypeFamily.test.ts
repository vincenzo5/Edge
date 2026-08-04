import { describe, expect, it } from "vitest";
import {
  composeOrderType,
  composeOrderTypeForFamily,
  decomposeOrderType,
} from "./orderTypeFamily";
import type { OrderType } from "./types";

const ALL_ORDER_TYPES: OrderType[] = [
  "MKT",
  "LMT",
  "STP",
  "STP LMT",
  "TRAIL",
  "TRAIL LIMIT",
  "MOC",
  "LOC",
];

describe("orderTypeFamily", () => {
  it("round-trips all eight order types", () => {
    for (const orderType of ALL_ORDER_TYPES) {
      expect(composeOrderType(decomposeOrderType(orderType))).toBe(orderType);
    }
  });

  it("maps market family fill timing", () => {
    expect(composeOrderType({ family: "market", fill: "now" })).toBe("MKT");
    expect(composeOrderType({ family: "market", fill: "close" })).toBe("MOC");
  });

  it("maps limit family fill timing", () => {
    expect(composeOrderType({ family: "limit", fill: "now" })).toBe("LMT");
    expect(composeOrderType({ family: "limit", fill: "close" })).toBe("LOC");
  });

  it("maps stop family exec type", () => {
    expect(composeOrderType({ family: "stop", execType: "market" })).toBe("STP");
    expect(composeOrderType({ family: "stop", execType: "limit" })).toBe("STP LMT");
  });

  it("maps trail family exec type", () => {
    expect(composeOrderType({ family: "trail", execType: "market" })).toBe("TRAIL");
    expect(composeOrderType({ family: "trail", execType: "limit" })).toBe("TRAIL LIMIT");
  });

  it("defaults fill to now and exec type to market when omitted", () => {
    expect(composeOrderType({ family: "market" })).toBe("MKT");
    expect(composeOrderType({ family: "limit" })).toBe("LMT");
    expect(composeOrderType({ family: "stop" })).toBe("STP");
    expect(composeOrderType({ family: "trail" })).toBe("TRAIL");
  });

  it("composeOrderTypeForFamily resets secondary to defaults", () => {
    expect(composeOrderTypeForFamily("market")).toBe("MKT");
    expect(composeOrderTypeForFamily("limit")).toBe("LMT");
    expect(composeOrderTypeForFamily("stop")).toBe("STP");
    expect(composeOrderTypeForFamily("trail")).toBe("TRAIL");
  });

  it("decomposes each order type to the expected family", () => {
    expect(decomposeOrderType("MKT")).toEqual({ family: "market", fill: "now" });
    expect(decomposeOrderType("MOC")).toEqual({ family: "market", fill: "close" });
    expect(decomposeOrderType("STP LMT")).toEqual({ family: "stop", execType: "limit" });
    expect(decomposeOrderType("TRAIL LIMIT")).toEqual({ family: "trail", execType: "limit" });
  });
});
