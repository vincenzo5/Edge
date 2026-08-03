import { qtyFromTicketDollarRisk } from "@/lib/risk/ticketSizeBudget";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import type { OrderSide } from "@/lib/trading/types";
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
};

export type ApplyPolicyToTradeDraftInput = {
  template: PlaybookTemplate;
  entryQty: number;
  side: OrderSide;
  planLevels?: PositionOrderLevels | null;
  entryPrice?: number | null;
  existingStop?: number | null;
  dollarRisk?: number | null;
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

/** Pure policy → ticket form patch (unbound draft or bound preview). */
export function applyPolicyToTradeDraft(
  input: ApplyPolicyToTradeDraftInput,
): PolicyTradeDraftPatch {
  const sizedEntryQty = resolveSizedEntryQty(input);
  const qtys = deriveProtectExitQuantities(input.template, sizedEntryQty);

  const geometryInput: ResolvePolicyTradeGeometryInput = {
    side: input.side,
    planLevels: input.planLevels,
    entryPrice: input.entryPrice,
    existingStop: input.existingStop,
    entryQty: sizedEntryQty,
    dollarRisk: input.dollarRisk,
    geometry: input.template.geometry,
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
  };
}
