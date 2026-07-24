import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { playbookInstances } from "@/db/schema";
import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
  PlaybookTemplate,
  RuleRuntime,
} from "@/lib/trading/playbook/types";
import { PlaybookTemplateSchema } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";

export type PlaybookInstancePatch = {
  status?: PlaybookInstanceStatus;
  ruleRuntimes?: RuleRuntime[];
  stopOrderId?: number | null;
  filledQty?: number | null;
};

const ACTIVE_STATUSES: PlaybookInstanceStatus[] = ["pending_fill", "armed", "paused"];

function rowToInstance(row: typeof playbookInstances.$inferSelect): PlaybookInstance {
  const filledQtyRaw = row.filledQty;
  const filledQty = filledQtyRaw == null ? undefined : Number(filledQtyRaw);
  const snapshotRaw = row.templateSnapshot;
  const templateSnapshot =
    snapshotRaw != null
      ? (PlaybookTemplateSchema.safeParse(snapshotRaw).success
          ? PlaybookTemplateSchema.parse(snapshotRaw)
          : undefined)
      : undefined;
  return {
    id: row.id,
    templateId: row.templateId,
    templateSnapshot,
    positionPlan: row.positionPlan as PlaybookInstance["positionPlan"],
    status: row.status as PlaybookInstanceStatus,
    ruleRuntimes: row.ruleRuntimes as PlaybookInstance["ruleRuntimes"],
    orderIntentId: row.orderIntentId ?? undefined,
    orderRef: row.orderRef ?? undefined,
    stopOrderId: row.stopOrderId ?? undefined,
    filledQty: filledQty != null && Number.isFinite(filledQty) ? filledQty : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findPlaybookInstanceById(
  userId: string,
  id: string,
): Promise<PlaybookInstance | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(eq(playbookInstances.userId, userId), eq(playbookInstances.id, id)))
    .limit(1);
  return rows[0] ? rowToInstance(rows[0]) : null;
}

export async function findPlaybookInstanceByOrderIntentId(
  userId: string,
  orderIntentId: string,
): Promise<PlaybookInstance | null> {
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
  return rows[0] ? rowToInstance(rows[0]) : null;
}

export async function insertPlaybookInstance(
  userId: string,
  instance: PlaybookInstance,
): Promise<PlaybookInstance> {
  const db = getDb();
  await db.insert(playbookInstances).values({
    id: instance.id,
    userId,
    templateId: instance.templateId,
    templateSnapshot: instance.templateSnapshot ?? null,
    status: instance.status,
    positionPlan: instance.positionPlan,
    ruleRuntimes: instance.ruleRuntimes,
    orderIntentId: instance.orderIntentId ?? null,
    orderRef: instance.orderRef ?? null,
    stopOrderId: instance.stopOrderId ?? null,
    filledQty: instance.filledQty ?? null,
    createdAt: new Date(instance.createdAt),
    updatedAt: new Date(instance.updatedAt),
  });
  return instance;
}

export async function patchPlaybookInstance(
  userId: string,
  id: string,
  patch: PlaybookInstancePatch,
): Promise<PlaybookInstance | null> {
  const existing = await findPlaybookInstanceById(userId, id);
  if (!existing) return null;

  const updatedAt = new Date().toISOString();
  const db = getDb();
  await db
    .update(playbookInstances)
    .set({
      ...(patch.status != null ? { status: patch.status } : {}),
      ...(patch.ruleRuntimes != null ? { ruleRuntimes: patch.ruleRuntimes } : {}),
      ...(patch.stopOrderId !== undefined ? { stopOrderId: patch.stopOrderId } : {}),
      ...(patch.filledQty !== undefined ? { filledQty: patch.filledQty } : {}),
      updatedAt: new Date(updatedAt),
    })
    .where(and(eq(playbookInstances.userId, userId), eq(playbookInstances.id, id)));

  return {
    ...existing,
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.ruleRuntimes != null ? { ruleRuntimes: patch.ruleRuntimes } : {}),
    ...(patch.stopOrderId !== undefined ? { stopOrderId: patch.stopOrderId ?? undefined } : {}),
    ...(patch.filledQty !== undefined
      ? {
          filledQty:
            patch.filledQty != null && Number.isFinite(patch.filledQty)
              ? patch.filledQty
              : undefined,
        }
      : {}),
    updatedAt,
  };
}

export async function patchPlaybookInstanceStatus(
  userId: string,
  id: string,
  status: PlaybookInstanceStatus,
): Promise<PlaybookInstance | null> {
  return patchPlaybookInstance(userId, id, { status });
}

export async function listActivePlaybookInstances(
  userId: string,
  options?: { environment?: TradingEnvironment },
): Promise<PlaybookInstance[]> {
  const db = getDb();
  const conditions = [eq(playbookInstances.userId, userId), inArray(playbookInstances.status, ACTIVE_STATUSES)];
  if (options?.environment) {
    conditions.push(
      sql`${playbookInstances.positionPlan}->>'environment' = ${options.environment}`,
    );
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.updatedAt} DESC`);

  return rows.map(rowToInstance);
}

export async function listPlaybookInstancesByAccount(
  userId: string,
  accountId: string,
  options?: { activeOnly?: boolean },
): Promise<PlaybookInstance[]> {
  const db = getDb();
  const normalizedAccountId = accountId.trim();
  const conditions = [
    eq(playbookInstances.userId, userId),
    sql`${playbookInstances.positionPlan}->>'accountId' = ${normalizedAccountId}`,
  ];
  if (options?.activeOnly) {
    conditions.push(inArray(playbookInstances.status, ACTIVE_STATUSES));
  }

  const rows = await db
    .select()
    .from(playbookInstances)
    .where(and(...conditions))
    .orderBy(sql`${playbookInstances.updatedAt} DESC`);

  return rows.map(rowToInstance);
}
