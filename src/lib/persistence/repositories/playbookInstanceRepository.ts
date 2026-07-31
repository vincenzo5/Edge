import "server-only";

import { and, eq, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { playbookInstances } from "@/db/schema";
import {
  instanceToRowValues,
  rowToPlaybookInstance,
} from "@/lib/risk/policy/instancePersistence";
import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
  PlaybookInstanceWithPolicy,
  RuleRuntime,
} from "@/lib/trading/playbook/types";
import type { PolicyBindingRef } from "@/lib/risk/policy/slotSchemas";
import type { TradingEnvironment } from "@/lib/trading/types";

export type PlaybookInstancePatch = {
  status?: PlaybookInstanceStatus;
  ruleRuntimes?: RuleRuntime[];
  stopOrderId?: number | null;
  filledQty?: number | null;
  alertBundleId?: string | null;
  controlMode?: PlaybookInstance["controlMode"];
  offReason?: PlaybookInstance["offReason"];
  protect?: PlaybookInstance["protect"];
  protectState?: PlaybookInstance["protectState"];
  protectCheckedAt?: string | null;
  entrySchedule?: PlaybookInstance["entrySchedule"];
  entryOrder?: PlaybookInstance["entryOrder"];
  scheduledFor?: string | null;
  scheduledAt?: string | null;
  orderIntentId?: string;
  orderRef?: string;
  positionPlan?: PlaybookInstance["positionPlan"];
  detachedAt?: string | null;
  closedAt?: string | null;
  armedAt?: string | null;
};

const ACTIVE_STATUSES: PlaybookInstanceStatus[] = ["pending_fill", "armed", "paused"];

export async function findPlaybookInstanceById(
  userId: string,
  id: string,
): Promise<PlaybookInstanceWithPolicy | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(eq(playbookInstances.userId, userId), eq(playbookInstances.id, id)))
    .limit(1);
  return rows[0] ? rowToPlaybookInstance(rows[0]) : null;
}

export async function findPlaybookInstanceByOrderIntentId(
  userId: string,
  orderIntentId: string,
): Promise<PlaybookInstanceWithPolicy | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookInstances)
    .where(
      and(
        eq(playbookInstances.userId, userId),
        eq(playbookInstances.orderIntentId, orderIntentId),
      ),
    )
    .limit(1);
  return rows[0] ? rowToPlaybookInstance(rows[0]) : null;
}

export async function findActivePlaybookInstanceByTradeKey(
  userId: string,
  args: {
    environment: TradingEnvironment;
    accountId: string;
    symbol: string;
  },
): Promise<PlaybookInstanceWithPolicy | null> {
  const db = getDb();
  const normalizedSymbol = args.symbol.trim().toUpperCase();
  const rows = await db
    .select()
    .from(playbookInstances)
    .where(
      and(
        eq(playbookInstances.userId, userId),
        eq(playbookInstances.environment, args.environment),
        eq(playbookInstances.accountId, args.accountId.trim()),
        eq(playbookInstances.symbol, normalizedSymbol),
        inArray(playbookInstances.status, ACTIVE_STATUSES),
      ),
    )
    .limit(1);
  return rows[0] ? rowToPlaybookInstance(rows[0]) : null;
}

export async function findPlannedPlaybookInstanceByBinding(
  userId: string,
  bindingRef: PolicyBindingRef,
): Promise<PlaybookInstanceWithPolicy | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookInstances)
    .where(
      and(
        eq(playbookInstances.userId, userId),
        eq(playbookInstances.bindingRefKind, bindingRef.kind),
        eq(playbookInstances.bindingRefId, bindingRef.id),
        eq(playbookInstances.status, "planned"),
      ),
    )
    .limit(1);
  return rows[0] ? rowToPlaybookInstance(rows[0]) : null;
}

export async function insertPlaybookInstance(
  userId: string,
  instance: PlaybookInstanceWithPolicy,
): Promise<PlaybookInstanceWithPolicy> {
  const db = getDb();
  const values = instanceToRowValues(instance);
  await db.insert(playbookInstances).values({
    id: instance.id,
    userId,
    ...values,
  });
  return instance;
}

export async function patchPlaybookInstance(
  userId: string,
  id: string,
  patch: PlaybookInstancePatch,
): Promise<PlaybookInstanceWithPolicy | null> {
  const existing = await findPlaybookInstanceById(userId, id);
  if (!existing) return null;

  const updatedAt = new Date().toISOString();
  const merged: PlaybookInstanceWithPolicy = {
    ...existing,
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.ruleRuntimes != null ? { ruleRuntimes: patch.ruleRuntimes } : {}),
    ...(patch.stopOrderId !== undefined
      ? { stopOrderId: patch.stopOrderId ?? undefined }
      : {}),
    ...(patch.filledQty !== undefined
      ? {
          filledQty:
            patch.filledQty != null && Number.isFinite(patch.filledQty)
              ? patch.filledQty
              : undefined,
        }
      : {}),
    ...(patch.alertBundleId !== undefined
      ? { alertBundleId: patch.alertBundleId ?? undefined }
      : {}),
    ...(patch.controlMode != null ? { controlMode: patch.controlMode } : {}),
    ...(patch.offReason != null ? { offReason: patch.offReason } : {}),
    ...(patch.protect != null ? { protect: patch.protect } : {}),
    ...(patch.protectState != null ? { protectState: patch.protectState } : {}),
    ...(patch.protectCheckedAt !== undefined
      ? { protectCheckedAt: patch.protectCheckedAt ?? undefined }
      : {}),
    ...(patch.entrySchedule != null ? { entrySchedule: patch.entrySchedule } : {}),
    ...(patch.entryOrder != null ? { entryOrder: patch.entryOrder } : {}),
    ...(patch.scheduledFor !== undefined
      ? { scheduledFor: patch.scheduledFor ?? undefined }
      : {}),
    ...(patch.scheduledAt !== undefined ? { scheduledAt: patch.scheduledAt ?? undefined } : {}),
    ...(patch.orderIntentId != null ? { orderIntentId: patch.orderIntentId } : {}),
    ...(patch.orderRef != null ? { orderRef: patch.orderRef } : {}),
    ...(patch.positionPlan != null ? { positionPlan: patch.positionPlan } : {}),
    ...(patch.detachedAt !== undefined ? { detachedAt: patch.detachedAt ?? undefined } : {}),
    ...(patch.closedAt !== undefined ? { closedAt: patch.closedAt ?? undefined } : {}),
    ...(patch.armedAt !== undefined ? { armedAt: patch.armedAt ?? undefined } : {}),
    updatedAt,
  };

  const db = getDb();
  const values = instanceToRowValues(merged);
  await db
    .update(playbookInstances)
    .set({
      ...values,
      updatedAt: new Date(updatedAt),
    })
    .where(and(eq(playbookInstances.userId, userId), eq(playbookInstances.id, id)));

  return merged;
}

export async function patchPlaybookInstanceStatus(
  userId: string,
  id: string,
  status: PlaybookInstanceStatus,
): Promise<PlaybookInstanceWithPolicy | null> {
  return patchPlaybookInstance(userId, id, { status });
}

export async function listActivePlaybookInstances(
  userId: string,
  options?: { environment?: TradingEnvironment },
): Promise<PlaybookInstanceWithPolicy[]> {
  const db = getDb();
  const conditions = [
    eq(playbookInstances.userId, userId),
    inArray(playbookInstances.status, ACTIVE_STATUSES),
  ];
  if (options?.environment) {
    conditions.push(eq(playbookInstances.environment, options.environment));
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.updatedAt} DESC`);

  return rows.map(rowToPlaybookInstance);
}

export async function listPlannedPlaybookInstances(
  userId: string,
  options?: { environment?: TradingEnvironment },
): Promise<PlaybookInstanceWithPolicy[]> {
  const db = getDb();
  const conditions = [
    eq(playbookInstances.userId, userId),
    eq(playbookInstances.status, "planned"),
  ];
  if (options?.environment) {
    conditions.push(eq(playbookInstances.environment, options.environment));
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.updatedAt} DESC`);

  return rows.map(rowToPlaybookInstance);
}

export async function listDuePlannedPlaybookInstances(
  userId: string,
  args: { environment?: TradingEnvironment; now: Date },
): Promise<PlaybookInstanceWithPolicy[]> {
  const db = getDb();
  const conditions = [
    eq(playbookInstances.userId, userId),
    eq(playbookInstances.status, "planned"),
    sql`${playbookInstances.scheduledFor} IS NOT NULL`,
    sql`${playbookInstances.scheduledFor} <= ${args.now.toISOString()}`,
  ];
  if (args.environment) {
    conditions.push(eq(playbookInstances.environment, args.environment));
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.scheduledFor} ASC`);

  return rows.map(rowToPlaybookInstance);
}

export async function listPlaybookInstancesByAccount(
  userId: string,
  accountId: string,
  options?: { activeOnly?: boolean },
): Promise<PlaybookInstanceWithPolicy[]> {
  const db = getDb();
  const normalizedAccountId = accountId.trim();
  const conditions = [
    eq(playbookInstances.userId, userId),
    or(
      eq(playbookInstances.accountId, normalizedAccountId),
      sql`${playbookInstances.positionPlan}->>'accountId' = ${normalizedAccountId}`,
    )!,
  ];
  if (options?.activeOnly) {
    conditions.push(inArray(playbookInstances.status, ACTIVE_STATUSES));
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.updatedAt} DESC`);

  return rows.map(rowToPlaybookInstance);
}
