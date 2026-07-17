import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userWatchlistLibrary } from "@/db/schema";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import type { WatchlistSnapshot } from "@/lib/persistence/schemas/watchlistLibrary";
import {
  saveRevisionedLibraryRecord,
  type RevisionedLibraryOps,
} from "@/lib/persistence/repositories/revisionedLibraryRepository";

export type WatchlistLibraryRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  watchlistSnapshot: WatchlistSnapshot;
};

export type SaveWatchlistLibraryInput = {
  userId: string;
  watchlistSnapshot: WatchlistSnapshot;
  baseRevision: number;
};

export type SaveWatchlistLibraryResult =
  | { ok: true; record: WatchlistLibraryRecord }
  | { ok: false; code: "conflict"; current: WatchlistLibraryRecord };

function toRecord(row: typeof userWatchlistLibrary.$inferSelect): WatchlistLibraryRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    watchlistSnapshot: row.watchlistSnapshot as WatchlistSnapshot,
  };
}

export async function getWatchlistLibrary(userId: string): Promise<WatchlistLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userWatchlistLibrary)
    .where(eq(userWatchlistLibrary.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createWatchlistLibrary(
  userId: string,
  watchlistSnapshot: WatchlistSnapshot = DEFAULT_WATCHLIST_STATE,
): Promise<WatchlistLibraryRecord> {
  const db = getDb();
  const rows = await db
    .insert(userWatchlistLibrary)
    .values({
      userId,
      schemaVersion: 1,
      watchlistSnapshot,
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]);
}

async function insertWatchlistLibraryIfAbsent(
  userId: string,
  watchlistSnapshot: WatchlistSnapshot,
): Promise<WatchlistLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .insert(userWatchlistLibrary)
    .values({
      userId,
      schemaVersion: 1,
      watchlistSnapshot,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ? toRecord(rows[0]) : null;
}

const watchlistLibraryOps: RevisionedLibraryOps<
  WatchlistSnapshot,
  WatchlistLibraryRecord
> = {
  get: getWatchlistLibrary,
  insertIfAbsent: insertWatchlistLibraryIfAbsent,
  updateIfRevision: async (userId, watchlistSnapshot, baseRevision, nextRevision) => {
    const db = getDb();
    const rows = await db
      .update(userWatchlistLibrary)
      .set({
        watchlistSnapshot,
        syncRevision: nextRevision,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userWatchlistLibrary.userId, userId),
          eq(userWatchlistLibrary.syncRevision, baseRevision),
        ),
      )
      .returning();

    return rows[0] ? toRecord(rows[0]) : null;
  },
  createFailedMessage: "Failed to create watchlist library",
};

export async function saveWatchlistLibrary(
  input: SaveWatchlistLibraryInput,
): Promise<SaveWatchlistLibraryResult> {
  return saveRevisionedLibraryRecord(watchlistLibraryOps, {
    userId: input.userId,
    snapshot: input.watchlistSnapshot,
    baseRevision: input.baseRevision,
  });
}
