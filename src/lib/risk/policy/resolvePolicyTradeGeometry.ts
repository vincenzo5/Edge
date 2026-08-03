import { targetPriceForRMultiple, type RiskDirection } from "@edge/chart-core";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import type { OrderSide } from "@/lib/trading/types";
import type { GeometryRecipe } from "./slotSchemas";

export type ResolvedPolicyTradeGeometry = {
  entry: number;
  stop: number;
  target: number;
  /** How prices were derived — for diagnostics only. */
  source: "planLevels" | "entryAndStop" | "entryAndDollarRisk";
};

function directionFromSide(side: OrderSide): RiskDirection {
  return side === "BUY" ? "long" : "short";
}

function stopPriceForRMultiple(
  entry: number,
  riskDistance: number,
  direction: RiskDirection,
  rMultiple: number,
): number {
  if (direction === "long") return entry - riskDistance * rMultiple;
  return entry + riskDistance * rMultiple;
}

function firstRMultiple(
  legs: Array<{ rMultiple?: number; price?: number }> | undefined,
  fallback: number,
): number {
  const leg = legs?.[0];
  if (leg?.price != null && Number.isFinite(leg.price)) {
    return fallback;
  }
  if (leg?.rMultiple != null && Number.isFinite(leg.rMultiple) && leg.rMultiple > 0) {
    return leg.rMultiple;
  }
  return fallback;
}

function resolveFromRecipe(args: {
  entry: number;
  direction: RiskDirection;
  geometry: GeometryRecipe | undefined;
  riskDistance: number;
}): { stop: number; target: number } {
  const stopR = firstRMultiple(args.geometry?.stops, 1);
  const targetR = firstRMultiple(args.geometry?.targets, 1);
  const stopLeg = args.geometry?.stops?.[0];
  const targetLeg = args.geometry?.targets?.[0];

  const stop =
    stopLeg?.price != null && Number.isFinite(stopLeg.price)
      ? stopLeg.price
      : stopPriceForRMultiple(args.entry, args.riskDistance, args.direction, stopR);

  const target =
    targetLeg?.price != null && Number.isFinite(targetLeg.price)
      ? targetLeg.price
      : targetPriceForRMultiple(args.entry, stop, args.direction, targetR);

  return { stop, target };
}

export type ResolvePolicyTradeGeometryInput = {
  side: OrderSide;
  planLevels?: PositionOrderLevels | null;
  entryPrice?: number | null;
  existingStop?: number | null;
  entryQty?: number | null;
  dollarRisk?: number | null;
  geometry?: GeometryRecipe;
};

/** Resolve entry/stop/target for policy draft apply — never invents silent bad prices. */
export function resolvePolicyTradeGeometry(
  input: ResolvePolicyTradeGeometryInput,
): ResolvedPolicyTradeGeometry | null {
  if (input.planLevels) {
    return {
      entry: input.planLevels.entry,
      stop: input.planLevels.stop,
      target: input.planLevels.target,
      source: "planLevels",
    };
  }

  const entry = input.entryPrice;
  if (entry == null || !Number.isFinite(entry) || entry <= 0) {
    return null;
  }

  const direction = directionFromSide(input.side);
  const existingStop = input.existingStop;

  if (existingStop != null && Number.isFinite(existingStop) && existingStop > 0) {
    const riskDistance = Math.abs(entry - existingStop);
    if (riskDistance <= 0) return null;
    const targetR = firstRMultiple(input.geometry?.targets, 1);
    const targetLeg = input.geometry?.targets?.[0];
    const target =
      targetLeg?.price != null && Number.isFinite(targetLeg.price)
        ? targetLeg.price
        : targetPriceForRMultiple(entry, existingStop, direction, targetR);
    return {
      entry,
      stop: existingStop,
      target,
      source: "entryAndStop",
    };
  }

  const qty = input.entryQty;
  const dollarRisk = input.dollarRisk;
  if (
    qty == null ||
    dollarRisk == null ||
    !Number.isFinite(qty) ||
    !Number.isFinite(dollarRisk) ||
    qty <= 0 ||
    dollarRisk <= 0
  ) {
    return null;
  }

  const riskDistance = dollarRisk / qty;
  if (riskDistance <= 0) return null;

  const { stop, target } = resolveFromRecipe({
    entry,
    direction,
    geometry: input.geometry,
    riskDistance,
  });

  return {
    entry,
    stop,
    target,
    source: "entryAndDollarRisk",
  };
}
