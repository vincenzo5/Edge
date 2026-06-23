import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userWatchlistLibrary } from "@/db/schema";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import type { WatchlistSnapshot } from "@/lib/persistence/schemas/watchlistLibrary";

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

export async function saveWatchlistLibrary(
  input: SaveWatchlistLibraryInput,
): Promise<SaveWatchlistLibraryResult> {
  const db = getDb();
  const existing = await getWatchlistLibrary(input.userId);
  if (!existing) {
    const created = await insertWatchlistLibraryIfAbsent(input.userId, input.watchlistSnapshot);
    if (created) {
      if (input.baseRevision !== 0) {
        return { ok: false, code: "conflict", current: created };
      }
      return { ok: true, record: created };
    }

    const current = await getWatchlistLibrary(input.userId);
    if (!current) {
      throw new Error("Failed to create watchlist library");
    }

    return { ok: false, code: "conflict", current };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(userWatchlistLibrary)
    .set({
      watchlistSnapshot: input.watchlistSnapshot,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userWatchlistLibrary.userId, input.userId),
        eq(userWatchlistLibrary.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getWatchlistLibrary(input.userId);
    return { ok: false, code: "conflict", current: current ?? existing };
  }

  return { ok: true, record: toRecord(row) };
}
