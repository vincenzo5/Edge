import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { userResearchSessions } from "@/db/schema";
import type {
  ResearchCardSketch,
  ResearchLinkSketch,
  ResearchReelBeatSketch,
} from "@/lib/research/sessionSketch";
import { RESEARCH_SESSION_SKETCH_VERSION } from "@/lib/research/sessionSketch";

export type ResearchSessionSummary = {
  id: string;
  title: string;
  schemaVersion: typeof RESEARCH_SESSION_SKETCH_VERSION;
  syncRevision: number;
  updatedAt: string;
  cardCount: number;
  linkCount: number;
};

export type ResearchSessionRecord = {
  id: string;
  title: string;
  schemaVersion: typeof RESEARCH_SESSION_SKETCH_VERSION;
  syncRevision: number;
  updatedAt: string;
  question?: string;
  cards: ResearchCardSketch[];
  links: ResearchLinkSketch[];
  threadIds: string[];
  reel: ResearchReelBeatSketch[];
};

export type SaveResearchSessionInput = {
  userId: string;
  sessionId: string;
  title?: string;
  question?: string;
  cards: ResearchCardSketch[];
  links: ResearchLinkSketch[];
  threadIds: string[];
  reel: ResearchReelBeatSketch[];
  baseRevision: number;
};

export type SaveResearchSessionResult =
  | { ok: true; record: ResearchSessionRecord }
  | { ok: false; code: "not_found" | "conflict"; current?: ResearchSessionRecord };

export type CreateResearchSessionInput = {
  userId: string;
  id?: string;
  title?: string;
  question?: string;
  cards?: ResearchCardSketch[];
  links?: ResearchLinkSketch[];
  threadIds?: string[];
  reel?: ResearchReelBeatSketch[];
};

function toRecord(row: typeof userResearchSessions.$inferSelect): ResearchSessionRecord {
  return {
    id: row.id,
    title: row.title,
    schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    ...(row.question ? { question: row.question } : {}),
    cards: row.cards as ResearchCardSketch[],
    links: row.links as ResearchLinkSketch[],
    threadIds: row.threadIds as string[],
    reel: row.reel as ResearchReelBeatSketch[],
  };
}

function toSummary(row: typeof userResearchSessions.$inferSelect): ResearchSessionSummary {
  const cards = row.cards as ResearchCardSketch[];
  const links = row.links as ResearchLinkSketch[];
  return {
    id: row.id,
    title: row.title,
    schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    cardCount: cards.length,
    linkCount: links.length,
  };
}

export async function listResearchSessions(userId: string): Promise<ResearchSessionSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userResearchSessions)
    .where(and(eq(userResearchSessions.userId, userId), isNull(userResearchSessions.archivedAt)))
    .orderBy(desc(userResearchSessions.updatedAt));

  return rows.map(toSummary);
}

export async function createResearchSession(
  input: CreateResearchSessionInput,
): Promise<ResearchSessionRecord> {
  const db = getDb();
  const rows = await db
    .insert(userResearchSessions)
    .values({
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      title: input.title ?? "Research session",
      schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
      question: input.question ?? null,
      cards: input.cards ?? [],
      links: input.links ?? [],
      threadIds: input.threadIds ?? [],
      reel: input.reel ?? [],
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]!);
}

export async function getResearchSessionById(
  userId: string,
  sessionId: string,
  options?: { includeArchived?: boolean },
): Promise<ResearchSessionRecord | null> {
  const db = getDb();
  const conditions = [
    eq(userResearchSessions.id, sessionId),
    eq(userResearchSessions.userId, userId),
  ];
  if (!options?.includeArchived) {
    conditions.push(isNull(userResearchSessions.archivedAt));
  }

  const rows = await db
    .select()
    .from(userResearchSessions)
    .where(and(...conditions))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function saveResearchSession(
  input: SaveResearchSessionInput,
): Promise<SaveResearchSessionResult> {
  const db = getDb();
  const existing = await getResearchSessionById(input.userId, input.sessionId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(userResearchSessions)
    .set({
      title: input.title ?? existing.title,
      question: input.question ?? existing.question ?? null,
      cards: input.cards,
      links: input.links,
      threadIds: input.threadIds,
      reel: input.reel,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userResearchSessions.id, input.sessionId),
        eq(userResearchSessions.userId, input.userId),
        eq(userResearchSessions.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getResearchSessionById(input.userId, input.sessionId);
    return { ok: false, code: "conflict", current: current ?? undefined };
  }

  return { ok: true, record: toRecord(row) };
}

export type ArchiveResearchSessionResult = { ok: true } | { ok: false; code: "not_found" };

export async function archiveResearchSession(
  userId: string,
  sessionId: string,
): Promise<ArchiveResearchSessionResult> {
  const existing = await getResearchSessionById(userId, sessionId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  const db = getDb();
  await db
    .update(userResearchSessions)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userResearchSessions.id, sessionId), eq(userResearchSessions.userId, userId)));

  return { ok: true };
}
