import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userAppWorkspaces } from "@/db/schema";
import { createDefaultWorkspacesState } from "@/lib/appWorkspace/storage";
import type { AppWorkspacesSnapshot } from "@/lib/persistence/schemas/appWorkspaces";
import {
  saveRevisionedLibraryRecord,
  type RevisionedLibraryOps,
} from "@/lib/persistence/repositories/revisionedLibraryRepository";

export type AppWorkspacesLibraryRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  appWorkspacesSnapshot: AppWorkspacesSnapshot;
};

export type SaveAppWorkspacesLibraryInput = {
  userId: string;
  appWorkspacesSnapshot: AppWorkspacesSnapshot;
  baseRevision: number;
};

export type SaveAppWorkspacesLibraryResult =
  | { ok: true; record: AppWorkspacesLibraryRecord }
  | { ok: false; code: "conflict"; current: AppWorkspacesLibraryRecord };

function toRecord(row: typeof userAppWorkspaces.$inferSelect): AppWorkspacesLibraryRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    appWorkspacesSnapshot: row.appWorkspacesSnapshot as AppWorkspacesSnapshot,
  };
}

export async function getAppWorkspacesLibrary(
  userId: string,
): Promise<AppWorkspacesLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userAppWorkspaces)
    .where(eq(userAppWorkspaces.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createAppWorkspacesLibrary(
  userId: string,
  appWorkspacesSnapshot: AppWorkspacesSnapshot = createDefaultWorkspacesState(),
): Promise<AppWorkspacesLibraryRecord> {
  const db = getDb();
  const rows = await db
    .insert(userAppWorkspaces)
    .values({
      userId,
      schemaVersion: 1,
      appWorkspacesSnapshot,
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]);
}

async function insertAppWorkspacesLibraryIfAbsent(
  userId: string,
  appWorkspacesSnapshot: AppWorkspacesSnapshot,
): Promise<AppWorkspacesLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .insert(userAppWorkspaces)
    .values({
      userId,
      schemaVersion: 1,
      appWorkspacesSnapshot,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ? toRecord(rows[0]) : null;
}

const appWorkspacesLibraryOps: RevisionedLibraryOps<
  AppWorkspacesSnapshot,
  AppWorkspacesLibraryRecord
> = {
  get: getAppWorkspacesLibrary,
  insertIfAbsent: insertAppWorkspacesLibraryIfAbsent,
  updateIfRevision: async (userId, appWorkspacesSnapshot, baseRevision, nextRevision) => {
    const db = getDb();
    const rows = await db
      .update(userAppWorkspaces)
      .set({
        appWorkspacesSnapshot,
        syncRevision: nextRevision,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userAppWorkspaces.userId, userId),
          eq(userAppWorkspaces.syncRevision, baseRevision),
        ),
      )
      .returning();

    return rows[0] ? toRecord(rows[0]) : null;
  },
  createFailedMessage: "Failed to create app workspaces library",
};

export async function saveAppWorkspacesLibrary(
  input: SaveAppWorkspacesLibraryInput,
): Promise<SaveAppWorkspacesLibraryResult> {
  return saveRevisionedLibraryRecord(appWorkspacesLibraryOps, {
    userId: input.userId,
    snapshot: input.appWorkspacesSnapshot,
    baseRevision: input.baseRevision,
  });
}
