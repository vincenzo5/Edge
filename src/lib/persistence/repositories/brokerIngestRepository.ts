import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { brokerIngestCursors } from "@/db/schema";
import type { IngestCursorState } from "@/lib/brokerage/ingest/ingestExecutions";

export type BrokerIngestCursorRow = {
  connectionId: string;
  accountId: string | null;
  lastExecTime: string | null;
  lastSeenExecIds: string[];
  lastIngestAt: string | null;
  lastIngestError: string | null;
  lastFlexBackfillAt: string | null;
  updatedAt: string;
};

function rowToState(row: typeof brokerIngestCursors.$inferSelect): {
  cursor: IngestCursorState;
  meta: Omit<BrokerIngestCursorRow, "lastExecTime" | "lastSeenExecIds"> & IngestCursorState;
} {
  const lastSeenExecIds = Array.isArray(row.lastSeenExecIds)
    ? (row.lastSeenExecIds as string[])
    : [];
  const cursor: IngestCursorState = {
    lastExecTime: row.lastExecTime?.toISOString() ?? null,
    lastSeenExecIds,
  };
  return {
    cursor,
    meta: {
      connectionId: row.connectionId,
      accountId: row.accountId,
      lastExecTime: cursor.lastExecTime,
      lastSeenExecIds,
      lastIngestAt: row.lastIngestAt?.toISOString() ?? null,
      lastIngestError: row.lastIngestError,
      lastFlexBackfillAt: row.lastFlexBackfillAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

export async function getBrokerIngestCursor(
  userId: string,
  connectionId: string,
): Promise<{ cursor: IngestCursorState; row: BrokerIngestCursorRow | null }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(brokerIngestCursors)
    .where(
      and(
        eq(brokerIngestCursors.userId, userId),
        eq(brokerIngestCursors.connectionId, connectionId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      cursor: { lastExecTime: null, lastSeenExecIds: [] },
      row: null,
    };
  }
  const mapped = rowToState(row);
  return { cursor: mapped.cursor, row: mapped.meta };
}

export async function upsertBrokerIngestCursor(
  userId: string,
  connectionId: string,
  update: {
    accountId?: string | null;
    cursor: IngestCursorState;
    lastIngestAt?: Date | null;
    lastIngestError?: string | null;
    lastFlexBackfillAt?: Date | null;
  },
): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .insert(brokerIngestCursors)
    .values({
      userId,
      connectionId,
      accountId: update.accountId ?? null,
      lastExecTime: update.cursor.lastExecTime ? new Date(update.cursor.lastExecTime) : null,
      lastSeenExecIds: update.cursor.lastSeenExecIds,
      lastIngestAt: update.lastIngestAt ?? null,
      lastIngestError: update.lastIngestError ?? null,
      lastFlexBackfillAt: update.lastFlexBackfillAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [brokerIngestCursors.userId, brokerIngestCursors.connectionId],
      set: {
        accountId: update.accountId ?? null,
        lastExecTime: update.cursor.lastExecTime ? new Date(update.cursor.lastExecTime) : null,
        lastSeenExecIds: update.cursor.lastSeenExecIds,
        lastIngestAt: update.lastIngestAt ?? null,
        lastIngestError: update.lastIngestError ?? null,
        lastFlexBackfillAt: update.lastFlexBackfillAt ?? null,
        updatedAt: now,
      },
    });
}

export async function listBrokerIngestStatus(userId: string): Promise<BrokerIngestCursorRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(brokerIngestCursors)
    .where(eq(brokerIngestCursors.userId, userId))
    .orderBy(desc(brokerIngestCursors.updatedAt));
  return rows.map((row) => rowToState(row).meta);
}
