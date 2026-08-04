import { appendAudit } from "../auditLog";
import { LIVE_CONFIRMATION_TOKEN } from "../validateOrder";
import {
  defaultManagePlacementRecipe,
  entryOrderToDraftFields,
  type OrderExecutionRecipe,
} from "../orderExecutionRecipe";
import type { OrderDraft, PlacedOrderResult, TradingEnvironment } from "../types";

import { buildTrailOrderDraft, resolveAttachTrailRule } from "./attachTrail";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { resolveReduceQtyFromFilled } from "./reduceQty";
import type { PlaybookInstance, PlaybookRule } from "./types";

export type PlaybookMutationPort = {
  modifyOrder(
    accountId: string,
    orderId: number,
    patchInput: unknown,
    intentId?: string,
    environment?: TradingEnvironment,
    liveConfirmation?: string,
  ): Promise<{ order: PlacedOrderResult["order"]; intent: unknown | null }>;
  submitOrder(
    draftInput: unknown,
    idempotencyKey: string,
    previewIntentId?: string,
    liveConfirmation?: string,
  ): Promise<PlacedOrderResult>;
  cancelOrder(
    accountId: string,
    orderId: number,
    intentId?: string,
    environment?: TradingEnvironment,
    liveConfirmation?: string,
  ): Promise<{ order: PlacedOrderResult["order"]; intent: unknown | null }>;
};

export type ExecuteThenContext = {
  tradingService: PlaybookMutationPort;
  instance: PlaybookInstance;
  stopOrderId: number | null;
  filledQty: number;
  liveConfirmation?: string;
};

export type ExecuteThenResult =
  | { ok: true; stopOrderId?: number | null }
  | { ok: false; error: string; skippedReason?: string };

function resolveLiveConfirmation(
  environment: TradingEnvironment,
  liveConfirmation?: string,
): string | undefined {
  if (environment !== "live") return undefined;
  return liveConfirmation ?? LIVE_CONFIRMATION_TOKEN;
}

function resolveStopPrice(rule: PlaybookRule, instance: PlaybookInstance): number | null {
  if (rule.then.kind !== "modifyStop") return null;
  if (rule.then.breakEven) return instance.positionPlan.entry;
  return rule.then.stopPrice ?? null;
}

function buildReduceDraft(
  instance: PlaybookInstance,
  qty: number,
  placement?: OrderExecutionRecipe,
): OrderDraft {
  const plan = instance.positionPlan;
  const recipe = placement ?? defaultManagePlacementRecipe();
  const fields = entryOrderToDraftFields(recipe);
  return {
    accountId: plan.accountId,
    symbol: plan.symbol,
    side: plan.side === "BUY" ? "SELL" : "BUY",
    quantity: qty,
    orderType: fields.orderType,
    limitPrice: fields.limitPrice,
    stopPrice: fields.stopPrice,
    trailPercent: fields.trailPercent,
    environment: plan.environment,
    outsideRth: fields.outsideRth,
    tif: fields.tif,
    allOrNone: fields.allOrNone,
    usePriceMgmtAlgo: fields.usePriceMgmtAlgo,
  };
}

export async function executePlaybookThen(
  rule: PlaybookRule,
  context: ExecuteThenContext,
): Promise<ExecuteThenResult> {
  const { instance, tradingService, filledQty } = context;
  const plan = instance.positionPlan;
  const liveConfirmation = resolveLiveConfirmation(plan.environment, context.liveConfirmation);

  if (rule.then.kind === "modifyStop") {
    const stopPrice = resolveStopPrice(rule, instance);
    if (stopPrice == null) {
      return { ok: false, error: "modifyStop missing stop price", skippedReason: "invalid_action" };
    }
    if (context.stopOrderId == null) {
      return { ok: false, error: "Protective stop order not found", skippedReason: "stop_not_found" };
    }

    try {
      await tradingService.modifyOrder(
        plan.accountId,
        context.stopOrderId,
        { stopPrice },
        instance.orderIntentId,
        plan.environment,
        liveConfirmation,
      );
      appendAudit({
        action: "modify",
        outcome: "success",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:modifyStop`,
      });
      return { ok: true, stopOrderId: context.stopOrderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendAudit({
        action: "modify",
        outcome: "failed",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:${message}`,
      });
      return { ok: false, error: message };
    }
  }

  if (rule.then.kind === "reduceQty") {
    const qty = resolveReduceQtyFromFilled(rule.then, filledQty);
    if (qty == null) {
      return { ok: false, error: "Reduce qty rounds to zero", skippedReason: "zero_qty" };
    }

    const draft = buildReduceDraft(
      instance,
      qty,
      rule.then.kind === "reduceQty" ? rule.then.placement : undefined,
    );
    const idempotencyKey = `playbook-${instance.id}-${rule.id}-reduce`;

    try {
      await tradingService.submitOrder(draft, idempotencyKey, undefined, liveConfirmation);
      appendAudit({
        action: "submit",
        outcome: "success",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:reduceQty:${qty}`,
      });

      let stopOrderId = context.stopOrderId;
      if (stopOrderId != null) {
        const remaining = Math.max(0, filledQty - qty);
        if (remaining > 0) {
          try {
            await tradingService.modifyOrder(
              plan.accountId,
              stopOrderId,
              { quantity: remaining },
              instance.orderIntentId,
              plan.environment,
              liveConfirmation,
            );
          } catch {
            // Stop qty tighten is best-effort after scale.
          }
        }
      }

      return { ok: true, stopOrderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendAudit({
        action: "submit",
        outcome: "failed",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:${message}`,
      });
      return { ok: false, error: message };
    }
  }

  if (rule.then.kind === "attachTrail") {
    const stopLeg = resolveAttachTrailRule(rule);
    if (!stopLeg) {
      return { ok: false, error: "attachTrail missing stop leg", skippedReason: "invalid_action" };
    }
    if (filledQty <= 0) {
      return { ok: false, error: "No remaining qty for trail", skippedReason: "zero_qty" };
    }

    const idempotencyKey = `playbook-${instance.id}-${rule.id}-trail`;

    try {
      if (context.stopOrderId != null) {
        await tradingService.cancelOrder(
          plan.accountId,
          context.stopOrderId,
          instance.orderIntentId,
          plan.environment,
          liveConfirmation,
        );
      }

      const draft = buildTrailOrderDraft({
        instance,
        stopLeg,
        quantity: filledQty,
        placement: rule.then.kind === "attachTrail" ? rule.then.placement : undefined,
      });
      const placed = await tradingService.submitOrder(
        draft,
        idempotencyKey,
        undefined,
        liveConfirmation,
      );
      const stopOrderId = placed.order.orderId ?? null;
      if (stopOrderId == null) {
        return {
          ok: false,
          error: "Trail order placed without order id",
          skippedReason: "stop_not_found",
        };
      }

      appendAudit({
        action: "submit",
        outcome: "success",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:attachTrail:${stopOrderId}`,
      });
      return { ok: true, stopOrderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendAudit({
        action: "submit",
        outcome: "failed",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:${message}`,
      });
      return { ok: false, error: message };
    }
  }

  if (rule.then.kind === "flatten") {
    const qty = filledQty;
    if (qty <= 0) {
      return { ok: false, error: "No remaining qty to flatten", skippedReason: "zero_qty" };
    }
    const draft = buildReduceDraft(instance, qty, rule.then.placement);
    const idempotencyKey = `playbook-${instance.id}-${rule.id}-flatten`;
    try {
      await tradingService.submitOrder(draft, idempotencyKey, undefined, liveConfirmation);
      appendAudit({
        action: "submit",
        outcome: "success",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:flatten:${qty}`,
      });
      return { ok: true, stopOrderId: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendAudit({
        action: "submit",
        outcome: "failed",
        accountId: plan.accountId,
        intentId: instance.orderIntentId,
        orderRef: instance.orderRef,
        detail: `playbook:${instance.id}:${rule.id}:${message}`,
      });
      return { ok: false, error: message };
    }
  }

  const template = resolvePlaybookTemplateFromInstance(instance);
  const matched = template?.rules.find((item) => item.id === rule.id);
  const kind = matched?.then.kind ?? rule.then.kind;
  return {
    ok: false,
    error: `Action ${kind} deferred to later phase`,
    skippedReason: "deferred_phase",
  };
}
