import type { OrderDraft, OrderType } from "./types";

export function summarizeOrderTypeLabel(orderType: OrderType): string {
  switch (orderType) {
    case "MKT":
      return "MKT";
    case "LMT":
      return "LMT";
    case "STP":
      return "STP";
    case "STP LMT":
      return "STP LMT";
    case "TRAIL":
      return "TRAIL";
    case "TRAIL LIMIT":
      return "TRAIL LMT";
    case "MOC":
      return "MOC";
    case "LOC":
      return "LOC";
    default:
      return orderType;
  }
}

export function summarizeOrderPriceToken(args: {
  orderType: OrderType;
  limitPrice?: number | null;
  stopPrice?: number | null;
  lastPrice?: number | null;
}): string {
  const { orderType, limitPrice, stopPrice, lastPrice } = args;
  if (orderType === "MKT") return "MKT";
  if (orderType === "LMT" && limitPrice != null && Number.isFinite(limitPrice)) {
    return limitPrice.toFixed(2);
  }
  if (orderType === "STP" && stopPrice != null && Number.isFinite(stopPrice)) {
    return stopPrice.toFixed(2);
  }
  if (orderType === "STP LMT") {
    const stop =
      stopPrice != null && Number.isFinite(stopPrice) ? stopPrice.toFixed(2) : "—";
    const limit =
      limitPrice != null && Number.isFinite(limitPrice) ? limitPrice.toFixed(2) : "—";
    return `${stop}/${limit}`;
  }
  if (orderType === "TRAIL") {
    if (stopPrice != null && Number.isFinite(stopPrice)) return stopPrice.toFixed(2);
    return "TRAIL";
  }
  if (orderType === "TRAIL LIMIT" && limitPrice != null && Number.isFinite(limitPrice)) {
    return limitPrice.toFixed(2);
  }
  if (orderType === "LOC" && limitPrice != null && Number.isFinite(limitPrice)) {
    return limitPrice.toFixed(2);
  }
  if (orderType === "MOC") return "MOC";
  if (lastPrice != null && Number.isFinite(lastPrice)) return lastPrice.toFixed(2);
  return "—";
}

export function summarizeOrderCtaLabel(args: {
  side: OrderDraft["side"];
  quantity: number;
  symbol: string;
  orderType: OrderType;
  limitPrice?: number | null;
  stopPrice?: number | null;
  lastPrice?: number | null;
  loading?: boolean;
  schedulePreview?: boolean;
}): string {
  if (args.loading) return "Previewing…";
  if (args.schedulePreview) return "Preview schedule";
  const side = args.side === "BUY" ? "BUY" : "SELL";
  const priceToken = summarizeOrderPriceToken({
    orderType: args.orderType,
    limitPrice: args.limitPrice,
    stopPrice: args.stopPrice,
    lastPrice: args.lastPrice,
  });
  const typeToken = summarizeOrderTypeLabel(args.orderType);
  return `${side} ${args.quantity} ${args.symbol.trim().toUpperCase()} @ ${priceToken} ${typeToken}`;
}
