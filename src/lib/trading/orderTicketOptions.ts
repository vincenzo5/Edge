import {
  BRACKET_PARENT_ORDER_TYPES,
  supportsBracketAttach as recipeSupportsBracketAttach,
  tifOptionsForBracketParent,
} from "./orderExecutionRecipe";
import type { OrderType, TimeInForce } from "./types";

export const BRACKET_ENTRY_ORDER_TYPES = BRACKET_PARENT_ORDER_TYPES;

export function supportsBracketAttach(orderType: OrderType): boolean {
  return recipeSupportsBracketAttach(orderType);
}

export function bracketTifOptionsForOrderType(orderType: OrderType): TimeInForce[] {
  return tifOptionsForBracketParent(orderType);
}

export function supportsPriceMgmtAlgo(orderType: OrderType): boolean {
  return orderType === "LMT" || orderType === "STP LMT" || orderType === "TRAIL LIMIT" || orderType === "LOC";
}

const TIF_LABELS: Record<TimeInForce, string> = {
  DAY: "Day",
  GTC: "GTC",
  IOC: "IOC",
  OPG: "At the Opening",
};

export function tifLabel(tif: TimeInForce): string {
  return TIF_LABELS[tif];
}

export function tifOptionsForOrderType(orderType: OrderType): TimeInForce[] {
  switch (orderType) {
    case "MOC":
    case "LOC":
      return ["DAY"];
    case "STP":
    case "STP LMT":
    case "TRAIL":
    case "TRAIL LIMIT":
      return ["DAY", "GTC"];
    case "MKT":
    case "LMT":
    default:
      return ["DAY", "GTC", "IOC", "OPG"];
  }
}

export function isTifValidForOrderType(orderType: OrderType, tif: TimeInForce): boolean {
  return tifOptionsForOrderType(orderType).includes(tif);
}
