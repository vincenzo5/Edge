import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { productionErrorEvents } from "@/db/schema";

export type ProductionErrorEventResponse = {
  id: string;
  at: number;
  source: string;
  message: string;
  stack?: string;
  detail?: string;
  requestId?: string;
};

export type ProductionErrorInsertInput = {
  at: number;
  source: string;
  message: string;
  stack?: string;
  detail?: string;
  requestId?: string;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function rowToEvent(row: typeof productionErrorEvents.$inferSelect): ProductionErrorEventResponse {
  return {
    id: row.id,
    at: row.atMs,
    source: row.source,
    message: row.message,
    ...(row.stack ? { stack: row.stack } : {}),
    ...(row.detail ? { detail: row.detail } : {}),
    ...(row.requestId ? { requestId: row.requestId } : {}),
  };
}

export function normalizeProductionErrorListLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(limit)));
}

export async function insertProductionErrorEvent(
  userId: string,
  entry: ProductionErrorInsertInput,
): Promise<ProductionErrorEventResponse> {
  const db = getDb();
  const [row] = await db
    .insert(productionErrorEvents)
    .values({
      userId,
      atMs: entry.at,
      source: entry.source,
      message: entry.message,
      stack: entry.stack ?? null,
      detail: entry.detail ?? null,
      requestId: entry.requestId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert production error event.");
  }
  return rowToEvent(row);
}

export async function listProductionErrorEvents(
  userId: string,
  options: { limit?: number; beforeMs?: number } = {},
): Promise<ProductionErrorEventResponse[]> {
  const db = getDb();
  const limit = normalizeProductionErrorListLimit(options.limit);
  const conditions = [eq(productionErrorEvents.userId, userId)];
  if (options.beforeMs != null && Number.isFinite(options.beforeMs)) {
    conditions.push(lt(productionErrorEvents.atMs, options.beforeMs));
  }

  const rows = await db
    .select()
    .from(productionErrorEvents)
    .where(and(...conditions))
    .orderBy(desc(productionErrorEvents.atMs))
    .limit(limit);

  return rows.map(rowToEvent);
}

export async function purgeProductionErrorEventsOlderThan(cutoffMs: number): Promise<number> {
  const db = getDb();
  const result = await db
    .delete(productionErrorEvents)
    .where(lt(productionErrorEvents.atMs, cutoffMs))
    .returning({ id: productionErrorEvents.id });
  return result.length;
}
