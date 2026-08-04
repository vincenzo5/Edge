import { qtyFromTicketDollarRisk } from "@/lib/risk/ticketSizeBudget";
import {
  defaultEntryOrder,
  seedEntryOrderPrices,
  type EntryOrder,
} from "@/lib/trading/orderExecutionRecipe";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import type { OrderSide, OrderType, TimeInForce } from "@/lib/trading/types";
import { deriveProtectExitQuantities } from "./deriveProtectExitQuantities";
import {
  resolvePolicyTradeGeometry,
  type ResolvePolicyTradeGeometryInput,
} from "./resolvePolicyTradeGeometry";

export type PolicyTradeDraftPatch = {
  entryQty?: number;
  takeProfitQuantity: number;
  stopQuantity: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  manageTemplateId: string;
  takeProfitEnabled: boolean;
  stopLossEnabled: boolean;
  /** True when qty/manage seeded but prices could not be derived. */
  partialGeometry: boolean;
  orderType?: OrderType;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPercent?: number | null;
  tif?: TimeInForce;
  outsideRth?: boolean;
  allOrNone?: boolean;
  usePriceMgmtAlgo?: boolean;
};

export type ApplyPolicyToTradeDraftInput = {
  template: PlaybookTemplate;
  entryQty: number;
  side: OrderSide;
  planLevels?: PositionOrderLevels | null;
  entryPrice?: number | null;
  existingStop?: number | null;
  dollarRisk?: number | null;
  /** Reshape bound drawing target from policy Geometry while keeping entry/stop. */
  reshapeFromRecipe?: boolean;
};

function resolveSizedEntryQty(input: ApplyPolicyToTradeDraftInput): number {
  const entry =
    input.planLevels?.entry ??
    input.entryPrice ??
    null;
  const stop =
    input.planLevels?.stop ??
    input.existingStop ??
    null;
  if (
    entry == null ||
    stop == null ||
    input.dollarRisk == null ||
    !Number.isFinite(entry) ||
    !Number.isFinite(stop)
  ) {
    return input.entryQty;
  }
  const sized = qtyFromTicketDollarRisk({
    entry,
    stop,
    dollarRisk: input.dollarRisk,
  });
  if (sized == null || sized <= 0) {
    return input.entryQty;
  }
  return sized;
}

function resolveEntryOrderRecipe(input: ApplyPolicyToTradeDraftInput): EntryOrder {
  const base = input.template.defaultEntryOrder ?? defaultEntryOrder();
  return seedEntryOrderPrices(base, {
    planEntry: input.planLevels?.entry ?? input.entryPrice,
    planStop: input.planLevels?.stop ?? input.existingStop,
  });
}

/** Pure policy → ticket form patch (unbound draft or bound preview). */
export function applyPolicyToTradeDraft(
  input: ApplyPolicyToTradeDraftInput,
): PolicyTradeDraftPatch {
  const sizedEntryQty = resolveSizedEntryQty(input);
  const qtys = deriveProtectExitQuantities(input.template, sizedEntryQty);
  const entryOrder = resolveEntryOrderRecipe(input);

  const geometryInput: ResolvePolicyTradeGeometryInput = {
    side: input.side,
    planLevels: input.planLevels,
    entryPrice: input.entryPrice,
    existingStop: input.existingStop,
    entryQty: sizedEntryQty,
    dollarRisk: input.dollarRisk,
    geometry: input.template.geometry,
    reshapeFromRecipe: input.reshapeFromRecipe ?? Boolean(input.planLevels),
  };

  const geometry = resolvePolicyTradeGeometry(geometryInput);

  return {
    entryQty: sizedEntryQty,
    takeProfitQuantity: qtys.takeProfitQuantity,
    stopQuantity: qtys.stopQuantity,
    takeProfitPrice: geometry?.target ?? null,
    stopLossPrice: geometry?.stop ?? null,
    manageTemplateId: input.template.id,
    takeProfitEnabled: true,
    stopLossEnabled: true,
    partialGeometry: geometry == null,
    orderType: entryOrder.orderType,
    limitPrice: entryOrder.limitPrice ?? null,
    stopPrice: entryOrder.stopPrice ?? null,
    trailPercent: entryOrder.trailPercent ?? null,
    tif: entryOrder.tif,
    outsideRth: entryOrder.outsideRth,
    allOrNone: entryOrder.allOrNone,
    usePriceMgmtAlgo: entryOrder.usePriceMgmtAlgo,
  };
}
