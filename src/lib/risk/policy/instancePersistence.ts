import {
  PlaybookInstanceSchema,
  PlaybookTemplateSchema,
  type PlaybookInstance,
  type PlaybookInstanceWithPolicy,
} from "@/lib/trading/playbook/types";

import { playbookTemplateToRiskPolicyTemplate } from "./fromPlaybook";
import { riskPolicyTemplateToPlaybookTemplate } from "./templatePersistence";
import { RiskPolicyTemplateSchema } from "./types";

type InstanceRowSnapshot = {
  templateSnapshot: unknown;
  templateId: string;
  positionPlan: unknown;
  status: string;
  ruleRuntimes: unknown;
  environment: string | null;
  accountId: string | null;
  symbol: string | null;
  side: string | null;
  bindingRefKind: string | null;
  bindingRefId: string | null;
  controlMode: string | null;
  offReason: string | null;
  protect: unknown;
  protectState: string | null;
  protectCheckedAt: Date | null;
  entrySchedule: unknown;
  entryOrder: unknown;
  scheduledFor: Date | null;
  appliedAt: Date | null;
  armedAt: Date | null;
  scheduledAt: Date | null;
  detachedAt: Date | null;
  closedAt: Date | null;
  orderIntentId: string | null;
  orderRef: string | null;
  stopOrderId: number | null;
  filledQty: number | null;
  takeProfitOrderId: number | null;
  manageState: unknown;
  alertBundleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  id: string;
};

function parseTemplateSnapshot(snapshotRaw: unknown): {
  templateSnapshot?: PlaybookInstance["templateSnapshot"];
  policySnapshot?: PlaybookInstanceWithPolicy["policySnapshot"];
} {
  if (snapshotRaw == null) {
    return {};
  }
  const riskParsed = RiskPolicyTemplateSchema.safeParse(snapshotRaw);
  if (riskParsed.success) {
    return {
      policySnapshot: riskParsed.data,
      templateSnapshot: riskPolicyTemplateToPlaybookTemplate(riskParsed.data),
    };
  }
  const playbookParsed = PlaybookTemplateSchema.safeParse(snapshotRaw);
  if (playbookParsed.success) {
    return { templateSnapshot: playbookParsed.data };
  }
  return {};
}

export function rowToPlaybookInstance(row: InstanceRowSnapshot): PlaybookInstanceWithPolicy {
  const filledQtyRaw = row.filledQty;
  const filledQty = filledQtyRaw == null ? undefined : Number(filledQtyRaw);
  const snapshot = parseTemplateSnapshot(row.templateSnapshot);
  const positionPlan = row.positionPlan as PlaybookInstance["positionPlan"];

  const instance = PlaybookInstanceSchema.parse({
    id: row.id,
    templateId: row.templateId,
    templateSnapshot: snapshot.templateSnapshot,
    positionPlan,
    status: row.status,
    ruleRuntimes: row.ruleRuntimes,
    environment: row.environment ?? positionPlan.environment,
    accountId: row.accountId ?? positionPlan.accountId,
    symbol: row.symbol ?? positionPlan.symbol,
    side: row.side ?? positionPlan.side,
    ...(row.bindingRefKind && row.bindingRefId
      ? { bindingRef: { kind: row.bindingRefKind, id: row.bindingRefId } }
      : {}),
    ...(row.controlMode ? { controlMode: row.controlMode } : {}),
    ...(row.offReason ? { offReason: row.offReason } : {}),
    ...(row.protect != null ? { protect: row.protect } : {}),
    ...(row.protectState ? { protectState: row.protectState } : {}),
    ...(row.protectCheckedAt
      ? { protectCheckedAt: row.protectCheckedAt.toISOString() }
      : {}),
    ...(row.entrySchedule != null ? { entrySchedule: row.entrySchedule } : {}),
    ...(row.entryOrder != null ? { entryOrder: row.entryOrder } : {}),
    ...(row.scheduledFor ? { scheduledFor: row.scheduledFor.toISOString() } : {}),
    ...(row.appliedAt ? { appliedAt: row.appliedAt.toISOString() } : {}),
    ...(row.armedAt ? { armedAt: row.armedAt.toISOString() } : {}),
    ...(row.scheduledAt ? { scheduledAt: row.scheduledAt.toISOString() } : {}),
    ...(row.detachedAt ? { detachedAt: row.detachedAt.toISOString() } : {}),
    ...(row.closedAt ? { closedAt: row.closedAt.toISOString() } : {}),
    orderIntentId: row.orderIntentId ?? undefined,
    orderRef: row.orderRef ?? undefined,
    stopOrderId: row.stopOrderId ?? undefined,
    takeProfitOrderId: row.takeProfitOrderId ?? undefined,
    filledQty: filledQty != null && Number.isFinite(filledQty) ? filledQty : undefined,
    ...(row.manageState != null ? { manageState: row.manageState } : {}),
    alertBundleId: row.alertBundleId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  if (snapshot.policySnapshot) {
    return { ...instance, policySnapshot: snapshot.policySnapshot };
  }
  return instance;
}

export function instanceToRowValues(instance: PlaybookInstanceWithPolicy) {
  const plan = instance.positionPlan;
  const snapshot =
    instance.policySnapshot ??
    (instance.templateSnapshot ? instance.templateSnapshot : null);

  return {
    templateId: instance.templateId,
    templateSnapshot: snapshot,
    status: instance.status,
    positionPlan: plan,
    ruleRuntimes: instance.ruleRuntimes,
    environment: instance.environment ?? plan.environment,
    accountId: instance.accountId ?? plan.accountId,
    symbol: instance.symbol ?? plan.symbol,
    side: instance.side ?? plan.side,
    bindingRefKind: instance.bindingRef?.kind ?? null,
    bindingRefId: instance.bindingRef?.id ?? null,
    controlMode: instance.controlMode ?? null,
    offReason: instance.offReason ?? null,
    protect: instance.protect ?? [],
    protectState: instance.protectState ?? "unknown",
    protectCheckedAt: instance.protectCheckedAt
      ? new Date(instance.protectCheckedAt)
      : null,
    entrySchedule: instance.entrySchedule ?? null,
    entryOrder: instance.entryOrder ?? null,
    scheduledFor: instance.scheduledFor ? new Date(instance.scheduledFor) : null,
    appliedAt: instance.appliedAt ? new Date(instance.appliedAt) : null,
    armedAt: instance.armedAt ? new Date(instance.armedAt) : null,
    scheduledAt: instance.scheduledAt ? new Date(instance.scheduledAt) : null,
    detachedAt: instance.detachedAt ? new Date(instance.detachedAt) : null,
    closedAt: instance.closedAt ? new Date(instance.closedAt) : null,
    orderIntentId: instance.orderIntentId ?? null,
    orderRef: instance.orderRef ?? null,
    stopOrderId: instance.stopOrderId ?? null,
    takeProfitOrderId: instance.takeProfitOrderId ?? null,
    filledQty: instance.filledQty ?? null,
    manageState: instance.manageState ?? null,
    alertBundleId: instance.alertBundleId ?? null,
    createdAt: new Date(instance.createdAt),
    updatedAt: new Date(instance.updatedAt),
  };
}
