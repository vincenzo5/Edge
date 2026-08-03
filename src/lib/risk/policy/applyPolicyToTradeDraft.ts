import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import type { OrderSide } from "@/lib/trading/types";
import { deriveProtectExitQuantities } from "./deriveProtectExitQuantities";
import {
  resolvePolicyTradeGeometry,
  type ResolvePolicyTradeGeometryInput,
} from "./resolvePolicyTradeGeometry";

export type PolicyTradeDraftPatch = {
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

/** Pure policy → ticket form patch (unbound draft or bound preview). */
export function applyPolicyToTradeDraft(
  input: ApplyPolicyToTradeDraftInput,
): PolicyTradeDraftPatch {
  const qtys = deriveProtectExitQuantities(input.template, input.entryQty);

  const geometryInput: ResolvePolicyTradeGeometryInput = {
    side: input.side,
    planLevels: input.planLevels,
    entryPrice: input.entryPrice,
    existingStop: input.existingStop,
    entryQty: input.entryQty,
    dollarRisk: input.dollarRisk,
    geometry: input.template.geometry,
  };

  const geometry = resolvePolicyTradeGeometry(geometryInput);

  return {
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
