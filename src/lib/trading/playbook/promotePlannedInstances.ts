import "server-only";

import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import type { EntryOrder } from "@/lib/risk/policy/slotSchemas";
import type { PlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";
import type { PlaybookInstanceWithPolicy } from "@/lib/trading/playbook/types";
import type { OrderDraft, TradingEnvironment } from "@/lib/trading/types";

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
};

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
