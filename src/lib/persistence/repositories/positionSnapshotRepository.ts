import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { positionSnapshots } from "@/db/schema";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

export type PositionSnapshotResponse = {
  id: string;
  accountId: string;
  connectionId: string;
  capturedAt: string;
  positions: AccountPosition[];
};

function rowToResponse(row: typeof positionSnapshots.$inferSelect): PositionSnapshotResponse {
  return {
    id: row.id,
    accountId: row.accountId,
    connectionId: row.connectionId,
    capturedAt: row.capturedAt.toISOString(),
    positions: row.positions as AccountPosition[],
  };
}

export async function getLatestPositionSnapshot(
  userId: string,
  accountId: string,
  connectionId: string,
): Promise<PositionSnapshotResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(positionSnapshots)
    .where(
      and(
        eq(positionSnapshots.userId, userId),
        eq(positionSnapshots.accountId, accountId),
        eq(positionSnapshots.connectionId, connectionId),
      ),
    )
    .orderBy(desc(positionSnapshots.capturedAt))
    .limit(1);
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function upsertPositionSnapshot(
  userId: string,
  connectionId: string,
  accountId: string,
  positions: AccountPosition[],
  capturedAt: Date,
): Promise<void> {
  const db = getDb();
  await db
    .insert(positionSnapshots)
    .values({
      userId,
      accountId,
      connectionId,
      capturedAt,
      positions,
    })
    .onConflictDoUpdate({
      target: [
        positionSnapshots.userId,
        positionSnapshots.accountId,
        positionSnapshots.connectionId,
        positionSnapshots.capturedAt,
      ],
      set: {
        positions,
      },
    });
}

export async function listPositionSnapshots(
  userId: string,
  query: { accountId?: string; limit?: number } = {},
): Promise<PositionSnapshotResponse[]> {
  const db = getDb();
  const filters = [eq(positionSnapshots.userId, userId)];
  if (query.accountId) filters.push(eq(positionSnapshots.accountId, query.accountId));

  const rows = await db
    .select()
    .from(positionSnapshots)
    .where(and(...filters))
    .orderBy(desc(positionSnapshots.capturedAt))
    .limit(query.limit ?? 100);

  return rows.map(rowToResponse);
}
