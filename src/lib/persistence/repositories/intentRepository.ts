import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { orderIntents } from "@/db/schema";
import type { OrderDraft, OrderIntent, OrderIntentStatus } from "@/lib/trading/types";

function rowToIntent(row: typeof orderIntents.$inferSelect): OrderIntent {
  return {
    intentId: row.intentId,
    idempotencyKey: row.idempotencyKey,
    draft: row.draft as OrderDraft,
    status: row.status as OrderIntentStatus,
    orderRef: row.orderRef,
    permId: row.permId ?? null,
    orderId: row.orderId ?? null,
    createdAt: Number(row.createdAtMs),
    updatedAt: Number(row.updatedAtMs),
  };
}

export async function findIntentById(
  userId: string,
  intentId: string,
): Promise<OrderIntent | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(orderIntents)
    .where(and(eq(orderIntents.userId, userId), eq(orderIntents.intentId, intentId)))
    .limit(1);
  return rows[0] ? rowToIntent(rows[0]) : null;
}

export async function findIntentByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<OrderIntent | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(orderIntents)
    .where(
      and(
        eq(orderIntents.userId, userId),
        eq(orderIntents.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return rows[0] ? rowToIntent(rows[0]) : null;
}

export async function insertIntent(
  userId: string,
  record: OrderIntent & { draftHash: string },
): Promise<OrderIntent> {
  const db = getDb();
  await db.insert(orderIntents).values({
    intentId: record.intentId,
    userId,
    idempotencyKey: record.idempotencyKey,
    draftHash: record.draftHash,
    draft: record.draft,
    status: record.status,
    orderRef: record.orderRef,
    permId: record.permId ?? null,
    orderId: record.orderId ?? null,
    createdAtMs: record.createdAt,
    updatedAtMs: record.updatedAt,
  });
  return {
    intentId: record.intentId,
    idempotencyKey: record.idempotencyKey,
    draft: record.draft,
    status: record.status,
    orderRef: record.orderRef,
    permId: record.permId ?? null,
    orderId: record.orderId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function patchIntent(
  userId: string,
  intentId: string,
  patch: Partial<Pick<OrderIntent, "status" | "permId" | "orderId" | "orderRef">>,
): Promise<OrderIntent | null> {
  const existing = await findIntentById(userId, intentId);
  if (!existing) return null;

  const updatedAt = Date.now();
  const next: OrderIntent = {
    ...existing,
    ...patch,
    updatedAt,
  };

  const db = getDb();
  await db
    .update(orderIntents)
    .set({
      status: next.status,
      orderRef: next.orderRef,
      permId: next.permId ?? null,
      orderId: next.orderId ?? null,
      updatedAtMs: updatedAt,
    })
    .where(and(eq(orderIntents.userId, userId), eq(orderIntents.intentId, intentId)));

  return next;
}
