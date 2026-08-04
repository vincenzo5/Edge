import "server-only";

import { policySnapshotRequiresBracket } from "@/lib/risk/policy/submitProtectGate";
import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import type { RiskPolicyTemplate } from "@/lib/risk/policy/types";
import type { EntryOrder } from "@/lib/risk/policy/slotSchemas";
import { deriveProtectExitQuantities } from "@/lib/risk/policy/deriveProtectExitQuantities";
import { riskPolicyTemplateToPlaybookTemplate } from "@/lib/risk/policy/templatePersistence";
import {
  clampRecipeTifForBracket,
  defaultEntryOrder,
  entryOrderToDraftFields,
  seedEntryOrderPrices,
  validateStrictEntryOrder,
} from "@/lib/trading/orderExecutionRecipe";
import {
  buildBracketPlanFromLevels,
  buildFixedStopLeg,
  buildBracketPlanWithPrices,
} from "@/lib/trading/bracketPlan";
import { resolvePlaybookTemplateFromInstance } from "@/lib/trading/playbook/resolveTemplate";
import type { PlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";
import type { PlaybookInstanceWithPolicy } from "@/lib/trading/playbook/types";
import type {
  BracketPlacedResult,
  OrderDraft,
  TradingEnvironment,
} from "@/lib/trading/types";

export type PlannedPromotionPort = {
  submitOrder(
    draftInput: unknown,
    idempotencyKey: string,
    previewIntentId?: string,
    liveConfirmation?: string,
  ): Promise<{
    orderRef: string;
    intent: { intentId: string };
  }>;
  submitBracket?(
    planInput: unknown,
    idempotencyKey: string,
    previewIntentId?: string,
    liveConfirmation?: string,
  ): Promise<BracketPlacedResult>;
};

function planLevelsFromInstance(
  instance: PlaybookInstanceWithPolicy,
  takeProfitPrice?: number,
) {
  const plan = instance.positionPlan;
  const direction = plan.side === "BUY" ? ("long" as const) : ("short" as const);
  const risk = Math.abs(plan.entry - plan.initialStop);
  const target =
    takeProfitPrice ??
    resolveTargetFromPolicy(instance.policySnapshot, plan) ??
    (plan.side === "BUY" ? plan.entry + 2 * risk : plan.entry - 2 * risk);
  const riskRewardRatio = risk > 0 ? Math.abs(target - plan.entry) / risk : null;

  return {
    direction,
    side: plan.side,
    entry: plan.entry,
    stop: plan.initialStop,
    target,
    riskRewardRatio,
  };
}

function resolveTargetFromPolicy(
  template: RiskPolicyTemplate | undefined,
  plan: PlaybookInstanceWithPolicy["positionPlan"],
): number | null {
  const firstTarget = template?.geometry?.targets?.[0];
  if (firstTarget?.price != null && Number.isFinite(firstTarget.price)) {
    return firstTarget.price;
  }
  if (firstTarget?.rMultiple != null && Number.isFinite(firstTarget.rMultiple)) {
    const r = Math.abs(plan.entry - plan.initialStop);
    return plan.side === "BUY"
      ? plan.entry + firstTarget.rMultiple * r
      : plan.entry - firstTarget.rMultiple * r;
  }
  return null;
}

function resolveInstanceEntryOrder(instance: PlaybookInstanceWithPolicy): EntryOrder {
  const plan = instance.positionPlan;
  const base =
    instance.entryOrder ??
    instance.policySnapshot?.defaultEntryOrder ??
    defaultEntryOrder();
  return seedEntryOrderPrices(base, {
    planEntry: plan.entry,
    planStop: plan.initialStop,
  });
}

export function buildBracketPlanFromPlannedInstance(
  instance: PlaybookInstanceWithPolicy,
  args?: {
    takeProfitPrice?: number;
    takeProfitQuantity?: number;
    stopQuantity?: number;
  },
): ReturnType<typeof buildBracketPlanFromLevels> | null {
  const draft = buildEntryDraftFromPlannedInstance(instance);
  const planLevels = planLevelsFromInstance(instance, args?.takeProfitPrice);
  if (!policySnapshotRequiresBracket(instance.policySnapshot)) return null;

  const playbookTemplate = instance.policySnapshot
    ? riskPolicyTemplateToPlaybookTemplate(instance.policySnapshot)
    : resolvePlaybookTemplateFromInstance(instance);

  const derived =
    playbookTemplate != null
      ? deriveProtectExitQuantities(playbookTemplate, draft.quantity)
      : {
          takeProfitQuantity: draft.quantity,
          stopQuantity: draft.quantity,
          runnerQuantity: 0,
          restingScaleRuleId: null,
        };

  const takeProfitQuantity = args?.takeProfitQuantity ?? derived.takeProfitQuantity;
  const stopQuantity = args?.stopQuantity ?? derived.stopQuantity;

  return buildBracketPlanWithPrices({
    entry: draft,
    stopPrice: planLevels.stop,
    takeProfitPrice: planLevels.target,
    stopLeg: buildFixedStopLeg(planLevels.stop),
    takeProfitQuantity,
    stopQuantity,
  });
}

export async function promotePlannedInstanceNow(args: {
  instance: PlaybookInstanceWithPolicy;
  playbookStore: PlaybookInstanceStore;
  tradingService: PlannedPromotionPort;
  idempotencyKey: string;
  previewIntentId?: string;
  liveConfirmation?: string;
  takeProfitPrice?: number;
  takeProfitQuantity?: number;
  stopQuantity?: number;
  now?: Date;
}): Promise<PlaybookInstanceWithPolicy> {
  const now = args.now ?? new Date();
  if (args.instance.status !== "planned") {
    throw new Error(`Instance ${args.instance.id} is not planned (${args.instance.status})`);
  }

  const schedule = args.instance.entrySchedule;
  if (schedule && schedule.kind !== "immediate") {
    const fireAt =
      args.instance.scheduledFor ??
      (schedule ? resolveEntryScheduleFireAt(schedule, now) : null);
    if (fireAt && Date.parse(fireAt) > now.getTime()) {
      throw new Error("Entry schedule is not due yet — arm schedule instead of submit now");
    }
  }

  const bracketPlan = buildBracketPlanFromPlannedInstance(args.instance, {
    takeProfitPrice: args.takeProfitPrice,
    takeProfitQuantity: args.takeProfitQuantity,
    stopQuantity: args.stopQuantity,
  });

  if (bracketPlan && args.tradingService.submitBracket) {
    const placed = await args.tradingService.submitBracket(
      bracketPlan,
      args.idempotencyKey,
      args.previewIntentId,
      args.liveConfirmation,
    );
    const patched =
      (await args.playbookStore.patch(args.instance.id, {
        status: "pending_fill",
        orderIntentId: placed.intent.intentId,
        orderRef: placed.orderRef,
        stopOrderId: placed.stopOrder.orderId ?? null,
        takeProfitOrderId: placed.takeProfitOrder.orderId ?? null,
        scheduledAt: now.toISOString(),
      })) ?? args.instance;
    return patched;
  }

  const draft = buildEntryDraftFromPlannedInstance(args.instance);
  const placed = await args.tradingService.submitOrder(
    draft,
    args.idempotencyKey,
    args.previewIntentId,
    args.liveConfirmation,
  );
  const patched =
    (await args.playbookStore.patch(args.instance.id, {
      status: "pending_fill",
      orderIntentId: placed.intent.intentId,
      orderRef: placed.orderRef,
      scheduledAt: now.toISOString(),
    })) ?? args.instance;
  return patched;
}

export function buildEntryDraftFromPlannedInstance(
  instance: PlaybookInstanceWithPolicy,
): OrderDraft {
  const plan = instance.positionPlan;
  const entryOrder = clampRecipeTifForBracket(
    validateStrictEntryOrder(
      seedEntryOrderPrices(resolveInstanceEntryOrder(instance), {
        planEntry: plan.entry,
        planStop: plan.initialStop,
      }),
    ),
  );
  const fields = entryOrderToDraftFields(entryOrder);

  return {
    accountId: plan.accountId,
    symbol: plan.symbol,
    side: plan.side,
    quantity: plan.qty,
    orderType: fields.orderType,
    limitPrice: fields.limitPrice,
    stopPrice: fields.stopPrice,
    trailPercent: fields.trailPercent,
    environment: plan.environment,
    orderRef: instance.orderRef?.trim() || `edge-policy-${instance.id}`,
    outsideRth: fields.outsideRth,
    tif: fields.tif,
    allOrNone: fields.allOrNone,
    usePriceMgmtAlgo: fields.usePriceMgmtAlgo,
  };
}

export async function promoteDuePlannedInstances(args: {
  playbookStore: PlaybookInstanceStore;
  tradingService: PlannedPromotionPort;
  environments: TradingEnvironment[];
  liveConfirmation?: string;
  now?: Date;
}): Promise<{ promoted: number; errors: string[] }> {
  const now = args.now ?? new Date();
  const errors: string[] = [];
  let promoted = 0;

  for (const environment of args.environments) {
    const due = await args.playbookStore.listDuePlanned({ environment, now });
    for (const instance of due) {
      try {
        const idempotencyKey = `policy-schedule:${instance.id}`;
        await promotePlannedInstanceNow({
          instance,
          playbookStore: args.playbookStore,
          tradingService: args.tradingService,
          idempotencyKey,
          liveConfirmation: args.liveConfirmation,
          now,
        });
        promoted += 1;
      } catch (error) {
        errors.push(
          `promote:${instance.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return { promoted, errors };
}

/** Persist resolved scheduledFor when missing on planned instances. */
export async function materializePlannedSchedules(args: {
  playbookStore: PlaybookInstanceStore;
  now?: Date;
}): Promise<number> {
  const now = args.now ?? new Date();
  let updated = 0;
  const planned = await args.playbookStore.listPlanned();
  for (const instance of planned) {
    if (instance.scheduledFor || !instance.entrySchedule) continue;
    const fireAt = resolveEntryScheduleFireAt(instance.entrySchedule, now);
    if (!fireAt) continue;
    await args.playbookStore.patch(instance.id, { scheduledFor: fireAt });
    updated += 1;
  }
  return updated;
}
