import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { tradingAuditEvents } from "@/db/schema";
import type {
  TradingAuditAction,
  TradingAuditEntry,
  TradingAuditOutcome,
} from "@/lib/trading/auditLog";

export type TradingAuditEventResponse = {
  id: string;
  at: number;
  action: TradingAuditAction;
  outcome: TradingAuditOutcome;
  intentId?: string;
  orderRef?: string;
  requestId?: string;
  detail?: string;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function rowToEvent(row: typeof tradingAuditEvents.$inferSelect): TradingAuditEventResponse {
  return {
    id: row.id,
    at: row.atMs,
    action: row.action as TradingAuditAction,
    outcome: row.outcome as TradingAuditOutcome,
    ...(row.intentId ? { intentId: row.intentId } : {}),
    ...(row.orderRef ? { orderRef: row.orderRef } : {}),
    ...(row.requestId ? { requestId: row.requestId } : {}),
    ...(row.detail ? { detail: row.detail } : {}),
  };
}

export function normalizeTradingAuditListLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(limit)));
}

export async function insertTradingAuditEvent(
  userId: string,
  entry: TradingAuditEntry,
): Promise<TradingAuditEventResponse> {
  const db = getDb();
  const [row] = await db
    .insert(tradingAuditEvents)
    .values({
      userId,
      atMs: entry.at,
      action: entry.action,
      outcome: entry.outcome,
      intentId: entry.intentId ?? null,
      orderRef: entry.orderRef ?? null,
      requestId: entry.requestId ?? null,
      detail: entry.detail ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert trading audit event.");
  }
  return rowToEvent(row);
}

export async function listTradingAuditEvents(
  userId: string,
  options: { limit?: number; beforeMs?: number } = {},
): Promise<TradingAuditEventResponse[]> {
  const db = getDb();
  const limit = normalizeTradingAuditListLimit(options.limit);
  const conditions = [eq(tradingAuditEvents.userId, userId)];
  if (options.beforeMs != null && Number.isFinite(options.beforeMs)) {
    conditions.push(lt(tradingAuditEvents.atMs, options.beforeMs));
  }

  const rows = await db
    .select()
    .from(tradingAuditEvents)
    .where(and(...conditions))
    .orderBy(desc(tradingAuditEvents.atMs))
    .limit(limit);

  return rows.map(rowToEvent);
}

export async function purgeTradingAuditEventsOlderThan(cutoffMs: number): Promise<number> {
  const db = getDb();
  const result = await db
    .delete(tradingAuditEvents)
    .where(lt(tradingAuditEvents.atMs, cutoffMs))
    .returning({ id: tradingAuditEvents.id });
  return result.length;
}
