import type { OrderType } from "./types";

export type OrderFamily = "market" | "limit" | "stop" | "trail";
export type OrderFillTiming = "now" | "close";
export type OrderExecType = "market" | "limit";

export type OrderTypeFamilyState = {
  family: OrderFamily;
  fill?: OrderFillTiming;
  execType?: OrderExecType;
};

const ORDER_TYPE_TO_FAMILY: Record<OrderType, OrderTypeFamilyState> = {
  MKT: { family: "market", fill: "now" },
  MOC: { family: "market", fill: "close" },
  LMT: { family: "limit", fill: "now" },
  LOC: { family: "limit", fill: "close" },
  STP: { family: "stop", execType: "market" },
  "STP LMT": { family: "stop", execType: "limit" },
  TRAIL: { family: "trail", execType: "market" },
  "TRAIL LIMIT": { family: "trail", execType: "limit" },
};

export const ORDER_FAMILY_TABS = [
  { id: "market", label: "Market" },
  { id: "limit", label: "Limit" },
  { id: "stop", label: "Stop" },
  { id: "trail", label: "Trail" },
] as const;

export const FILL_SEGMENTS = [
  { id: "now", label: "Now" },
  { id: "close", label: "On close" },
] as const;

export const EXEC_TYPE_SEGMENTS = [
  { id: "market", label: "Market" },
  { id: "limit", label: "Limit" },
] as const;

export function decomposeOrderType(orderType: OrderType): OrderTypeFamilyState {
  return ORDER_TYPE_TO_FAMILY[orderType];
}

export function composeOrderType(state: OrderTypeFamilyState): OrderType {
  const { family } = state;
  if (family === "market") {
    return state.fill === "close" ? "MOC" : "MKT";
  }
  if (family === "limit") {
    return state.fill === "close" ? "LOC" : "LMT";
  }
  if (family === "stop") {
    return state.execType === "limit" ? "STP LMT" : "STP";
  }
  return state.execType === "limit" ? "TRAIL LIMIT" : "TRAIL";
}

export function composeOrderTypeForFamily(family: OrderFamily): OrderType {
  return composeOrderType({ family });
}
