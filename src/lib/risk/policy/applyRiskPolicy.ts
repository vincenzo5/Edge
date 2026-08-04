import { randomUUID } from "crypto";

import type { PlaybookInstanceWithPolicy } from "@/lib/trading/playbook/types";
import { PlaybookInstanceSchema } from "@/lib/trading/playbook/types";
import type { PositionPlan } from "@/lib/trading/playbook/types";
import {
  createPlaybookInstanceId,
  PlaybookInstanceConflictError,
  type PlaybookInstanceStore,
} from "@/lib/trading/playbookInstanceStore";

import { managedAppRulesFromExits } from "./templatePersistence";
import {
  defaultEntryOrder,
  defaultEntrySchedule,
  resolveTemplateExits,
  RiskPolicyInstanceSchema,
  type EntryOrder,
  type EntrySchedule,
  type PolicyBindingRef,
  type RiskPolicyInstance,
  type RiskPolicyTemplate,
} from "./types";
import { seedEntryOrderPrices } from "@/lib/trading/orderExecutionRecipe";

export type ApplyRiskPolicyConflictMode = "reject" | "swap";

export type ApplyRiskPolicyInput = {
  template: RiskPolicyTemplate;
  positionPlan: PositionPlan;
  bindingRef: PolicyBindingRef;
  entrySchedule?: EntrySchedule;
  entryOrder?: EntryOrder;
  scheduledFor?: string;
  id?: string;
  onConflict?: ApplyRiskPolicyConflictMode;
};

export type ApplyRiskPolicyResult =
  | { ok: true; instance: RiskPolicyInstance; playbookInstance: PlaybookInstanceWithPolicy }
  | { ok: false; error: string; conflict?: PlaybookInstanceWithPolicy };

function buildPlannedInstance(args: ApplyRiskPolicyInput): RiskPolicyInstance {
  const now = new Date().toISOString();
  const entrySchedule = args.entrySchedule ?? args.template.defaultEntrySchedule ?? defaultEntrySchedule();
  const entryOrder =
    args.entryOrder ??
    args.template.defaultEntryOrder ??
    (args.positionPlan.entry != null
      ? seedEntryOrderPrices(
          { orderType: "LMT", outsideRth: false, tif: "DAY", allOrNone: false, usePriceMgmtAlgo: false },
          { planEntry: args.positionPlan.entry, planStop: args.positionPlan.initialStop },
        )
      : defaultEntryOrder());
  const exits = resolveTemplateExits(args.template);
  const managedRules = managedAppRulesFromExits(exits);

  const instance = RiskPolicyInstanceSchema.parse({
    id: args.id ?? createPlaybookInstanceId(),
    templateId: args.template.id,
    policySnapshot: args.template,
    bindingRef: args.bindingRef,
    environment: args.positionPlan.environment,
    accountId: args.positionPlan.accountId,
    symbol: args.positionPlan.symbol.trim().toUpperCase(),
    side: args.positionPlan.side,
    positionPlan: args.positionPlan,
    entrySchedule,
    entryOrder,
    status: "planned",
    controlMode: "automated",
    exitRuntimes: (managedRules.length > 0 ? managedRules : exits).map((rule) => ({
      ruleId: rule.id,
      status: "pending" as const,
    })),
    protect: [],
    protectState: "unknown",
    scheduledFor: args.scheduledFor,
    createdAt: now,
    updatedAt: now,
  });

  return instance;
}

function toPlaybookInstance(policyInstance: RiskPolicyInstance): PlaybookInstanceWithPolicy {
  const parsed = PlaybookInstanceSchema.parse({
    id: policyInstance.id,
    templateId: policyInstance.templateId,
    positionPlan: policyInstance.positionPlan,
    status: policyInstance.status,
    ruleRuntimes: policyInstance.exitRuntimes,
    environment: policyInstance.environment,
    accountId: policyInstance.accountId,
    symbol: policyInstance.symbol,
    side: policyInstance.side,
    bindingRef: policyInstance.bindingRef,
    controlMode: policyInstance.controlMode,
    offReason: policyInstance.offReason,
    protect: policyInstance.protect,
    protectState: policyInstance.protectState,
    protectCheckedAt: policyInstance.protectCheckedAt,
    entrySchedule: policyInstance.entrySchedule,
    entryOrder: policyInstance.entryOrder,
    scheduledFor: policyInstance.scheduledFor,
    appliedAt: policyInstance.createdAt,
    orderIntentId: policyInstance.orderIntentId,
    orderRef: policyInstance.orderRef,
    stopOrderId: policyInstance.stopOrderId,
    filledQty: policyInstance.filledQty,
    alertBundleId: policyInstance.alertBundleId,
    createdAt: policyInstance.createdAt,
    updatedAt: policyInstance.updatedAt,
  });
  return { ...parsed, policySnapshot: policyInstance.policySnapshot };
}

async function findConflicts(
  store: PlaybookInstanceStore,
  policyInstance: RiskPolicyInstance,
): Promise<PlaybookInstanceWithPolicy | null> {
  const active = await store.findActiveByTradeKey({
    environment: policyInstance.environment,
    accountId: policyInstance.accountId,
    symbol: policyInstance.symbol,
  });
  if (active) return active;

  return store.findPlannedByBinding(policyInstance.bindingRef);
}

export async function applyRiskPolicy(
  store: PlaybookInstanceStore,
  input: ApplyRiskPolicyInput,
): Promise<ApplyRiskPolicyResult> {
  const onConflict = input.onConflict ?? "reject";
  const policyInstance = buildPlannedInstance(input);
  const conflict = await findConflicts(store, policyInstance);

  if (conflict) {
    if (onConflict === "reject") {
      return {
        ok: false,
        error: `Risk policy conflict: existing instance ${conflict.id} (${conflict.status})`,
        conflict,
      };
    }

    const now = new Date().toISOString();
    await store.patch(conflict.id, {
      status: conflict.status === "planned" ? "superseded" : "detached",
      offReason: "swapped",
      detachedAt: now,
    });
  }

  const playbookInstance = toPlaybookInstance(policyInstance);

  try {
    const created = await store.create(playbookInstance);
    return {
      ok: true,
      instance: policyInstance,
      playbookInstance: created,
    };
  } catch (error) {
    if (error instanceof PlaybookInstanceConflictError) {
      return {
        ok: false,
        error: error.message,
        conflict: error.conflict,
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Test helper — build planned policy instance without persisting. */
export function buildPlannedRiskPolicyInstance(
  input: Omit<ApplyRiskPolicyInput, "onConflict">,
): RiskPolicyInstance {
  return buildPlannedInstance({ ...input, id: input.id ?? randomUUID() });
}
