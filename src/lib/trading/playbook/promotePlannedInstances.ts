import "server-only";

import { policySnapshotRequiresBracket } from "@/lib/risk/policy/submitProtectGate";
import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import type { RiskPolicyTemplate } from "@/lib/risk/policy/types";
import type { EntryOrder } from "@/lib/risk/policy/slotSchemas";
import {
  buildBracketPlanFromLevels,
  buildFixedStopLeg,
} from "@/lib/trading/bracketPlan";
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

export function buildBracketPlanFromPlannedInstance(
  instance: PlaybookInstanceWithPolicy,
  takeProfitPrice?: number,
): ReturnType<typeof buildBracketPlanFromLevels> | null {
  const draft = buildEntryDraftFromPlannedInstance(instance);
  const planLevels = planLevelsFromInstance(instance, takeProfitPrice);
  const template = instance.policySnapshot;
  if (!policySnapshotRequiresBracket(template)) return null;
  return buildBracketPlanFromLevels({
    entry: draft,
    planLevels,
    stopLeg: buildFixedStopLeg(planLevels.stop),
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

  const bracketPlan = buildBracketPlanFromPlannedInstance(
    args.instance,
    args.takeProfitPrice,
  );

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

function mapEntryOrderType(type: EntryOrder["type"]): OrderDraft["orderType"] {
  if (type === "STP_LMT") return "STP LMT";
  return type;
}

export function buildEntryDraftFromPlannedInstance(
  instance: PlaybookInstanceWithPolicy,
): OrderDraft {
  const plan = instance.positionPlan;
  const entryOrder = instance.entryOrder ?? { type: "LMT" as const, limitPrice: plan.entry };
  const orderType = mapEntryOrderType(entryOrder.type);

  return {
    accountId: plan.accountId,
    symbol: plan.symbol,
    side: plan.side,
    quantity: plan.qty,
    orderType,
    limitPrice:
      entryOrder.limitPrice ??
      (orderType === "LMT" || orderType === "STP LMT" ? plan.entry : undefined),
    environment: plan.environment,
    orderRef: instance.orderRef?.trim() || `edge-policy-${instance.id}`,
    outsideRth: false,
    tif: "DAY",
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
        const draft = buildEntryDraftFromPlannedInstance(instance);
        const idempotencyKey = `policy-schedule:${instance.id}`;
        const placed = await args.tradingService.submitOrder(
          draft,
          idempotencyKey,
          undefined,
          args.liveConfirmation,
        );

        await args.playbookStore.patch(instance.id, {
          status: "pending_fill",
          orderIntentId: placed.intent.intentId,
          orderRef: placed.orderRef,
          scheduledAt: now.toISOString(),
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
