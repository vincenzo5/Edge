import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userScreenerLibrary } from "@/db/schema";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import type { ScreenerSnapshot } from "@/lib/persistence/schemas/screenerLibrary";
import {
  saveRevisionedLibraryRecord,
  type RevisionedLibraryOps,
} from "@/lib/persistence/repositories/revisionedLibraryRepository";

export type ScreenerLibraryRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  screenerSnapshot: ScreenerSnapshot;
};

export type SaveScreenerLibraryInput = {
  userId: string;
  screenerSnapshot: ScreenerSnapshot;
  baseRevision: number;
};

export type SaveScreenerLibraryResult =
  | { ok: true; record: ScreenerLibraryRecord }
  | { ok: false; code: "conflict"; current: ScreenerLibraryRecord };

function toRecord(row: typeof userScreenerLibrary.$inferSelect): ScreenerLibraryRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    screenerSnapshot: row.screenerSnapshot as ScreenerSnapshot,
  };
}

export async function getScreenerLibrary(userId: string): Promise<ScreenerLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userScreenerLibrary)
    .where(eq(userScreenerLibrary.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createScreenerLibrary(
  userId: string,
  screenerSnapshot: ScreenerSnapshot = DEFAULT_SCREENER_STATE,
): Promise<ScreenerLibraryRecord> {
  const db = getDb();
  const rows = await db
    .insert(userScreenerLibrary)
    .values({
      userId,
      schemaVersion: 1,
      screenerSnapshot,
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]);
}

async function insertScreenerLibraryIfAbsent(
  userId: string,
  screenerSnapshot: ScreenerSnapshot,
): Promise<ScreenerLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .insert(userScreenerLibrary)
    .values({
      userId,
      schemaVersion: 1,
      screenerSnapshot,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ? toRecord(rows[0]) : null;
}

const screenerLibraryOps: RevisionedLibraryOps<ScreenerSnapshot, ScreenerLibraryRecord> = {
  get: getScreenerLibrary,
  insertIfAbsent: insertScreenerLibraryIfAbsent,
  updateIfRevision: async (userId, screenerSnapshot, baseRevision, nextRevision) => {
    const db = getDb();
    const rows = await db
      .update(userScreenerLibrary)
      .set({
        screenerSnapshot,
        syncRevision: nextRevision,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userScreenerLibrary.userId, userId),
          eq(userScreenerLibrary.syncRevision, baseRevision),
        ),
      )
      .returning();

    return rows[0] ? toRecord(rows[0]) : null;
  },
  createFailedMessage: "Failed to create screener library",
};

export async function saveScreenerLibrary(
  input: SaveScreenerLibraryInput,
): Promise<SaveScreenerLibraryResult> {
  return saveRevisionedLibraryRecord(screenerLibraryOps, {
    userId: input.userId,
    snapshot: input.screenerSnapshot,
    baseRevision: input.baseRevision,
  });
}
