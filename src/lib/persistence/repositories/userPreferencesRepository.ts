import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userPreferences } from "@/db/schema";
import type { UserPreferencesSnapshot } from "@/lib/persistence/schemas/userPreferences";
import { createDefaultUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import {
  saveRevisionedLibraryRecord,
  type RevisionedLibraryOps,
} from "@/lib/persistence/repositories/revisionedLibraryRepository";

export type UserPreferencesLibraryRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  preferencesSnapshot: UserPreferencesSnapshot;
};

export type SaveUserPreferencesLibraryInput = {
  userId: string;
  preferencesSnapshot: UserPreferencesSnapshot;
  baseRevision: number;
};

export type SaveUserPreferencesLibraryResult =
  | { ok: true; record: UserPreferencesLibraryRecord }
  | { ok: false; code: "conflict"; current: UserPreferencesLibraryRecord };

function toRecord(row: typeof userPreferences.$inferSelect): UserPreferencesLibraryRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    preferencesSnapshot: row.preferencesSnapshot as UserPreferencesSnapshot,
  };
}

export async function getUserPreferencesLibrary(
  userId: string,
): Promise<UserPreferencesLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createUserPreferencesLibrary(
  userId: string,
  preferencesSnapshot: UserPreferencesSnapshot = createDefaultUserPreferencesSnapshot(),
): Promise<UserPreferencesLibraryRecord> {
  const db = getDb();
  const rows = await db
    .insert(userPreferences)
    .values({
      userId,
      schemaVersion: 1,
      preferencesSnapshot,
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]);
}

async function insertUserPreferencesLibraryIfAbsent(
  userId: string,
  preferencesSnapshot: UserPreferencesSnapshot,
): Promise<UserPreferencesLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .insert(userPreferences)
    .values({
      userId,
      schemaVersion: 1,
      preferencesSnapshot,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ? toRecord(rows[0]) : null;
}

const userPreferencesLibraryOps: RevisionedLibraryOps<
  UserPreferencesSnapshot,
  UserPreferencesLibraryRecord
> = {
  get: getUserPreferencesLibrary,
  insertIfAbsent: insertUserPreferencesLibraryIfAbsent,
  updateIfRevision: async (userId, preferencesSnapshot, baseRevision, nextRevision) => {
    const db = getDb();
    const rows = await db
      .update(userPreferences)
      .set({
        preferencesSnapshot,
        syncRevision: nextRevision,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userPreferences.userId, userId),
          eq(userPreferences.syncRevision, baseRevision),
        ),
      )
      .returning();

    return rows[0] ? toRecord(rows[0]) : null;
  },
  createFailedMessage: "Failed to create user preferences library",
};

export async function saveUserPreferencesLibrary(
  input: SaveUserPreferencesLibraryInput,
): Promise<SaveUserPreferencesLibraryResult> {
  return saveRevisionedLibraryRecord(userPreferencesLibraryOps, {
    userId: input.userId,
    snapshot: input.preferencesSnapshot,
    baseRevision: input.baseRevision,
  });
}
