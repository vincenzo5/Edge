import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { userPatternRecords, userPatternTaxonomy } from "@/db/schema";
import { createDefaultTaxonomy } from "@/lib/patternLibrary/taxonomy";
import type { PatternRecord, PatternTaxonomy } from "@/lib/patternLibrary/types";
import { patternRecordSchema, patternTaxonomySchema } from "@/lib/patternLibrary/types";
import type { PatternRecordMetadataPatch } from "@/lib/patternLibrary/storage";

export type PatternTaxonomyRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  taxonomy: PatternTaxonomy;
};

function toTaxonomyRecord(row: typeof userPatternTaxonomy.$inferSelect): PatternTaxonomyRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    taxonomy: patternTaxonomySchema.parse(row.taxonomy),
  };
}

function parseRecord(row: typeof userPatternRecords.$inferSelect): PatternRecord {
  return patternRecordSchema.parse(row.record);
}

function recordCapturedAt(record: PatternRecord): Date | null {
  const capturedAt = record.capture?.capturedAt;
  if (!capturedAt) return null;
  const parsed = new Date(capturedAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getPatternTaxonomy(userId: string): Promise<PatternTaxonomyRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPatternTaxonomy)
    .where(eq(userPatternTaxonomy.userId, userId))
    .limit(1);
  const row = rows[0];
  return row ? toTaxonomyRecord(row) : null;
}

export async function ensurePatternTaxonomy(userId: string): Promise<PatternTaxonomyRecord> {
  const existing = await getPatternTaxonomy(userId);
  if (existing) return existing;

  const db = getDb();
  const taxonomy = createDefaultTaxonomy();
  const rows = await db
    .insert(userPatternTaxonomy)
    .values({
      userId,
      schemaVersion: 1,
      taxonomy,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  if (rows[0]) {
    return toTaxonomyRecord(rows[0]);
  }

  const created = await getPatternTaxonomy(userId);
  if (!created) {
    throw new Error("Failed to create pattern taxonomy");
  }
  return created;
}

export async function listPatternRecords(userId: string): Promise<PatternRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPatternRecords)
    .where(eq(userPatternRecords.userId, userId))
    .orderBy(desc(userPatternRecords.capturedAt), desc(userPatternRecords.updatedAt));
  return rows.map(parseRecord);
}

export async function getPatternRecord(
  userId: string,
  recordId: string,
): Promise<PatternRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userPatternRecords)
    .where(and(eq(userPatternRecords.userId, userId), eq(userPatternRecords.recordId, recordId)))
    .limit(1);
  const row = rows[0];
  return row ? parseRecord(row) : null;
}

export async function upsertPatternRecord(userId: string, record: PatternRecord): Promise<void> {
  const parsed = patternRecordSchema.parse(record);
  const db = getDb();
  await db
    .insert(userPatternRecords)
    .values({
      userId,
      recordId: parsed.id,
      record: parsed,
      symbol: parsed.symbol.trim().toUpperCase(),
      setupFamilyId: parsed.setupFamilyId,
      capturedAt: recordCapturedAt(parsed),
    })
    .onConflictDoUpdate({
      target: [userPatternRecords.userId, userPatternRecords.recordId],
      set: {
        record: parsed,
        symbol: parsed.symbol.trim().toUpperCase(),
        setupFamilyId: parsed.setupFamilyId,
        capturedAt: recordCapturedAt(parsed),
        updatedAt: new Date(),
      },
    });
}

export async function patchPatternRecordMetadata(
  userId: string,
  recordId: string,
  patch: PatternRecordMetadataPatch,
): Promise<PatternRecord | null> {
  const existing = await getPatternRecord(userId, recordId);
  if (!existing) return null;

  const next: PatternRecord = {
    ...existing,
    ...(patch.setupFamilyId != null ? { setupFamilyId: patch.setupFamilyId } : {}),
    ...(patch.quality != null ? { quality: patch.quality } : {}),
    ...(patch.notes != null ? { notes: patch.notes } : {}),
    plan: {
      ...existing.plan,
      ...(patch.thesis != null ? { thesis: patch.thesis } : {}),
    },
  };

  await upsertPatternRecord(userId, next);
  return getPatternRecord(userId, recordId);
}

export async function patternLibraryStatsForUser(userId: string): Promise<{
  total: number;
  takes: number;
  passes: number;
  byFamily: Record<string, number>;
}> {
  const records = await listPatternRecords(userId);
  const byFamily: Record<string, number> = {};
  let takes = 0;
  let passes = 0;
  for (const record of records) {
    byFamily[record.setupFamilyId] = (byFamily[record.setupFamilyId] ?? 0) + 1;
    if (record.decision === "take") takes++;
    else passes++;
  }
  return { total: records.length, takes, passes, byFamily };
}
