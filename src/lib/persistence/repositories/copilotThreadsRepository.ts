import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { userCopilotThreads } from "@/db/schema";
import type { PersistedCopilotMessage } from "@/lib/persistence/schemas/copilotThreads";

export type CopilotThreadSummary = {
  id: string;
  title: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  messageCount: number;
  modelId?: string;
};

export type CopilotThreadRecord = {
  id: string;
  title: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  messages: PersistedCopilotMessage[];
  modelId?: string;
};

export type SaveCopilotThreadInput = {
  userId: string;
  threadId: string;
  title?: string;
  messages: PersistedCopilotMessage[];
  baseRevision: number;
  modelId?: string;
};

export type SaveCopilotThreadResult =
  | { ok: true; record: CopilotThreadRecord }
  | { ok: false; code: "not_found" | "conflict"; current?: CopilotThreadRecord };

export type CreateCopilotThreadInput = {
  userId: string;
  id?: string;
  title?: string;
  messages?: PersistedCopilotMessage[];
  modelId?: string;
};

function toRecord(row: typeof userCopilotThreads.$inferSelect): CopilotThreadRecord {
  return {
    id: row.id,
    title: row.title,
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages as PersistedCopilotMessage[],
    ...(row.modelId ? { modelId: row.modelId } : {}),
  };
}

function toSummary(row: typeof userCopilotThreads.$inferSelect): CopilotThreadSummary {
  const messages = row.messages as PersistedCopilotMessage[];
  return {
    id: row.id,
    title: row.title,
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    messageCount: messages.length,
    ...(row.modelId ? { modelId: row.modelId } : {}),
  };
}

export async function listCopilotThreads(userId: string): Promise<CopilotThreadSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userCopilotThreads)
    .where(and(eq(userCopilotThreads.userId, userId), isNull(userCopilotThreads.archivedAt)))
    .orderBy(desc(userCopilotThreads.updatedAt));

  return rows.map(toSummary);
}

export async function createCopilotThread(
  input: CreateCopilotThreadInput,
): Promise<CopilotThreadRecord> {
  const db = getDb();
  const rows = await db
    .insert(userCopilotThreads)
    .values({
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      title: input.title ?? "New chat",
      schemaVersion: 1,
      messages: input.messages ?? [],
      syncRevision: 1,
      ...(input.modelId ? { modelId: input.modelId } : {}),
    })
    .returning();

  return toRecord(rows[0]!);
}

export async function getCopilotThreadById(
  userId: string,
  threadId: string,
  options?: { includeArchived?: boolean },
): Promise<CopilotThreadRecord | null> {
  const db = getDb();
  const conditions = [
    eq(userCopilotThreads.id, threadId),
    eq(userCopilotThreads.userId, userId),
  ];
  if (!options?.includeArchived) {
    conditions.push(isNull(userCopilotThreads.archivedAt));
  }

  const rows = await db
    .select()
    .from(userCopilotThreads)
    .where(and(...conditions))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function saveCopilotThread(
  input: SaveCopilotThreadInput,
): Promise<SaveCopilotThreadResult> {
  const db = getDb();
  const existing = await getCopilotThreadById(input.userId, input.threadId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(userCopilotThreads)
    .set({
      title: input.title ?? existing.title,
      messages: input.messages,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
      ...(input.modelId !== undefined ? { modelId: input.modelId || null } : {}),
    })
    .where(
      and(
        eq(userCopilotThreads.id, input.threadId),
        eq(userCopilotThreads.userId, input.userId),
        eq(userCopilotThreads.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getCopilotThreadById(input.userId, input.threadId);
    return { ok: false, code: "conflict", current: current ?? undefined };
  }

  return { ok: true, record: toRecord(row) };
}

export type ArchiveCopilotThreadResult = { ok: true } | { ok: false; code: "not_found" };

export async function archiveCopilotThread(
  userId: string,
  threadId: string,
): Promise<ArchiveCopilotThreadResult> {
  const existing = await getCopilotThreadById(userId, threadId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  const db = getDb();
  await db
    .update(userCopilotThreads)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userCopilotThreads.id, threadId), eq(userCopilotThreads.userId, userId)));

  return { ok: true };
}
