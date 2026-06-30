import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userScreenerLibrary } from "@/db/schema";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import type { ScreenerSnapshot } from "@/lib/persistence/schemas/screenerLibrary";

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

export async function saveScreenerLibrary(
  input: SaveScreenerLibraryInput,
): Promise<SaveScreenerLibraryResult> {
  const db = getDb();
  const existing = await getScreenerLibrary(input.userId);
  if (!existing) {
    const created = await insertScreenerLibraryIfAbsent(input.userId, input.screenerSnapshot);
    if (created) {
      if (input.baseRevision !== 0) {
        return { ok: false, code: "conflict", current: created };
      }
      return { ok: true, record: created };
    }

    const current = await getScreenerLibrary(input.userId);
    if (!current) {
      throw new Error("Failed to create screener library");
    }

    return { ok: false, code: "conflict", current };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(userScreenerLibrary)
    .set({
      screenerSnapshot: input.screenerSnapshot,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userScreenerLibrary.userId, input.userId),
        eq(userScreenerLibrary.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getScreenerLibrary(input.userId);
    return { ok: false, code: "conflict", current: current ?? existing };
  }

  return { ok: true, record: toRecord(row) };
}
