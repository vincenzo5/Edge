import type { OrderSide } from "./types";
import type { RiskDirection } from "@edge/chart-core";

export type ProtectLegKind = "stop" | "target";

export type ProtectLinkField = "offset" | "price" | "usd" | "percent";

export type ProtectLegValues = {
  offset: number | null;
  price: number | null;
  usd: number | null;
  percent: number | null;
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Signed distance from entry to protect price in price points (always positive). */
export function protectOffsetFromPrice(args: {
  entry: number;
  price: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}): number | null {
  const { entry, price, direction, leg } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(price) || entry <= 0) return null;
  if (direction === "long") {
    if (leg === "stop") return roundPrice(Math.max(0, entry - price));
    return roundPrice(Math.max(0, price - entry));
  }
  if (leg === "stop") return roundPrice(Math.max(0, price - entry));
  return roundPrice(Math.max(0, entry - price));
}

export function protectPriceFromOffset(args: {
  entry: number;
  offset: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}): number | null {
  const { entry, offset, direction, leg } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(offset) || entry <= 0 || offset < 0) {
    return null;
  }
  if (direction === "long") {
    return roundPrice(leg === "stop" ? entry - offset : entry + offset);
  }
  return roundPrice(leg === "stop" ? entry + offset : entry - offset);
}

export function protectUsdFromPrice(args: {
  entry: number;
  price: number;
  quantity: number;
}): number | null {
  const { entry, price, quantity } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(price) || !Number.isFinite(quantity)) {
    return null;
  }
  if (quantity <= 0) return null;
  return roundUsd(Math.abs(entry - price) * quantity);
}

export function protectPercentFromPrice(args: {
  entry: number;
  price: number;
}): number | null {
  const { entry, price } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(price) || entry <= 0) return null;
  return roundPercent((Math.abs(entry - price) / entry) * 100);
}

export function protectPriceFromUsd(args: {
  entry: number;
  usd: number;
  quantity: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}): number | null {
  const { entry, usd, quantity, direction, leg } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(usd) || !Number.isFinite(quantity)) {
    return null;
  }
  if (entry <= 0 || quantity <= 0 || usd < 0) return null;
  const offset = usd / quantity;
  return protectPriceFromOffset({ entry, offset, direction, leg });
}

export function protectPriceFromPercent(args: {
  entry: number;
  percent: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}): number | null {
  const { entry, percent, direction, leg } = args;
  if (!Number.isFinite(entry) || !Number.isFinite(percent) || entry <= 0 || percent < 0) {
    return null;
  }
  const offset = (entry * percent) / 100;
  return protectPriceFromOffset({ entry, offset, direction, leg });
}

export function computeProtectLegValues(args: {
  entry: number;
  price: number;
  quantity: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
}): ProtectLegValues {
  const offset = protectOffsetFromPrice({
    entry: args.entry,
    price: args.price,
    direction: args.direction,
    leg: args.leg,
  });
  const usd = protectUsdFromPrice({
    entry: args.entry,
    price: args.price,
    quantity: args.quantity,
  });
  const percent = protectPercentFromPrice({ entry: args.entry, price: args.price });
  return {
    offset,
    price: Number.isFinite(args.price) ? roundPrice(args.price) : null,
    usd,
    percent,
  };
}

export function updateProtectLegField(args: {
  entry: number;
  quantity: number;
  direction: RiskDirection;
  leg: ProtectLegKind;
  field: ProtectLinkField;
  value: number;
  currentPrice: number | null;
}): number | null {
  const { entry, quantity, direction, leg, field, value } = args;
  if (!Number.isFinite(value)) return args.currentPrice;
  switch (field) {
    case "price":
      return roundPrice(value);
    case "offset":
      return protectPriceFromOffset({ entry, offset: value, direction, leg });
    case "usd":
      return protectPriceFromUsd({ entry, usd: value, quantity, direction, leg });
    case "percent":
      return protectPriceFromPercent({ entry, percent: value, direction, leg });
    default:
      return args.currentPrice;
  }
}

export function directionFromSide(side: OrderSide): RiskDirection {
  return side === "BUY" ? "long" : "short";
}

/** Default bracket seed when no chart drawing is bound (~2% stop, ~4% target). */
export function defaultProtectPrices(args: {
  entry: number;
  direction: RiskDirection;
  stopPercent?: number;
  targetPercent?: number;
}): { stop: number; target: number } {
  const stopPct = args.stopPercent ?? 2;
  const targetPct = args.targetPercent ?? 4;
  if (args.direction === "long") {
    return {
      stop: roundPrice(args.entry * (1 - stopPct / 100)),
      target: roundPrice(args.entry * (1 + targetPct / 100)),
    };
  }
  return {
    stop: roundPrice(args.entry * (1 + stopPct / 100)),
    target: roundPrice(args.entry * (1 - targetPct / 100)),
  };
}

export function formatProtectInput(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

export function parseProtectInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
