import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { accountSnapshots } from "@/db/schema";
import type { ParsedAccountMetrics } from "@/lib/brokerage/ingest/parseAccountSummary";

export type AccountSnapshotResponse = {
  id: string;
  accountId: string;
  connectionId: string;
  capturedAt: string;
  netLiquidation: number | null;
  cash: number | null;
  buyingPower: number | null;
  grossPositionValue: number | null;
};

function rowToResponse(row: typeof accountSnapshots.$inferSelect): AccountSnapshotResponse {
  return {
    id: row.id,
    accountId: row.accountId,
    connectionId: row.connectionId,
    capturedAt: row.capturedAt.toISOString(),
    netLiquidation: row.netLiquidation,
    cash: row.cash,
    buyingPower: row.buyingPower,
    grossPositionValue: row.grossPositionValue,
  };
}

export async function getLatestAccountSnapshot(
  userId: string,
  accountId: string,
  connectionId: string,
): Promise<AccountSnapshotResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(accountSnapshots)
    .where(
      and(
        eq(accountSnapshots.userId, userId),
        eq(accountSnapshots.accountId, accountId),
        eq(accountSnapshots.connectionId, connectionId),
      ),
    )
    .orderBy(desc(accountSnapshots.capturedAt))
    .limit(1);
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function upsertAccountSnapshot(
  userId: string,
  connectionId: string,
  metrics: ParsedAccountMetrics,
  capturedAt: Date,
): Promise<void> {
  const accountId = metrics.accountId?.trim();
  if (!accountId) return;

  const db = getDb();
  await db
    .insert(accountSnapshots)
    .values({
      userId,
      accountId,
      connectionId,
      capturedAt,
      netLiquidation: metrics.netLiquidation,
      cash: metrics.cash,
      buyingPower: metrics.buyingPower,
      grossPositionValue: metrics.grossPositionValue,
    })
    .onConflictDoUpdate({
      target: [
        accountSnapshots.userId,
        accountSnapshots.accountId,
        accountSnapshots.connectionId,
        accountSnapshots.capturedAt,
      ],
      set: {
        netLiquidation: metrics.netLiquidation,
        cash: metrics.cash,
        buyingPower: metrics.buyingPower,
        grossPositionValue: metrics.grossPositionValue,
      },
    });
}

export async function listAccountSnapshots(
  userId: string,
  query: { accountId?: string; from?: string; to?: string; limit?: number } = {},
): Promise<AccountSnapshotResponse[]> {
  const db = getDb();
  const filters = [eq(accountSnapshots.userId, userId)];
  if (query.accountId) filters.push(eq(accountSnapshots.accountId, query.accountId));
  if (query.from) filters.push(gte(accountSnapshots.capturedAt, new Date(query.from)));
  if (query.to) filters.push(lte(accountSnapshots.capturedAt, new Date(query.to)));

  const rows = await db
    .select()
    .from(accountSnapshots)
    .where(and(...filters))
    .orderBy(desc(accountSnapshots.capturedAt))
    .limit(query.limit ?? 500);

  return rows.map(rowToResponse);
}
