import "server-only";

import { and, asc, eq, max, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { journalTradeScreenshots, journalTrades } from "@/db/schema";
import type { JournalScreenshotSource } from "@/lib/journal/screenshotValidation";
import {
  deleteJournalScreenshotFile,
  readJournalScreenshotFile,
  validateJournalScreenshotUpload,
  writeJournalScreenshotFile,
  journalScreenshotStorageKey,
  type JournalScreenshotMimeType,
} from "@/lib/journal/screenshotStorage";
import type {
  JournalScreenshotPatch,
  JournalScreenshotResponse,
} from "@/lib/persistence/schemas/journal";

function rowToResponse(row: typeof journalTradeScreenshots.$inferSelect): JournalScreenshotResponse {
  return {
    id: row.id,
    tradeId: row.tradeId,
    sortIndex: row.sortIndex,
    caption: row.caption,
    mimeType: row.mimeType as JournalScreenshotMimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    source: row.source as JournalScreenshotSource,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertTradeOwned(userId: string, tradeId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: journalTrades.id })
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function listJournalTradeScreenshots(
  userId: string,
  tradeId: string,
): Promise<JournalScreenshotResponse[]> {
  if (!(await assertTradeOwned(userId, tradeId))) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(journalTradeScreenshots)
    .where(and(eq(journalTradeScreenshots.userId, userId), eq(journalTradeScreenshots.tradeId, tradeId)))
    .orderBy(asc(journalTradeScreenshots.sortIndex), asc(journalTradeScreenshots.createdAt));
  return rows.map(rowToResponse);
}

export async function countJournalTradeScreenshots(
  userId: string,
  tradeId: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalTradeScreenshots)
    .where(and(eq(journalTradeScreenshots.userId, userId), eq(journalTradeScreenshots.tradeId, tradeId)));
  return rows[0]?.count ?? 0;
}

export async function createJournalTradeScreenshot(
  userId: string,
  tradeId: string,
  input: {
    bytes: Buffer;
    mimeType: string;
    source: JournalScreenshotSource;
    caption?: string | null;
    width?: number | null;
    height?: number | null;
  },
): Promise<JournalScreenshotResponse | null> {
  if (!(await assertTradeOwned(userId, tradeId))) return null;

  const existingCount = await countJournalTradeScreenshots(userId, tradeId);
  const validated = validateJournalScreenshotUpload(
    input.mimeType,
    input.bytes.byteLength,
    existingCount,
  );
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const db = getDb();
  const maxSortRows = await db
    .select({ maxSort: max(journalTradeScreenshots.sortIndex) })
    .from(journalTradeScreenshots)
    .where(and(eq(journalTradeScreenshots.userId, userId), eq(journalTradeScreenshots.tradeId, tradeId)));
  const nextSortIndex = (maxSortRows[0]?.maxSort ?? -1) + 1;

  const screenshotId = randomUUID();
  const storageKey = journalScreenshotStorageKey(userId, tradeId, screenshotId, validated.mimeType);

  await writeJournalScreenshotFile(storageKey, input.bytes);

  try {
    const rows = await db
      .insert(journalTradeScreenshots)
      .values({
        id: screenshotId,
        userId,
        tradeId,
        sortIndex: nextSortIndex,
        caption: input.caption?.trim() || null,
        mimeType: validated.mimeType,
        byteSize: input.bytes.byteLength,
        storageKey,
        width: input.width ?? null,
        height: input.height ?? null,
        source: input.source,
      })
      .returning();
    const row = rows[0];
    if (!row) return null;
    return rowToResponse(row);
  } catch (error) {
    await deleteJournalScreenshotFile(storageKey);
    throw error;
  }
}

export async function getJournalTradeScreenshotById(
  userId: string,
  tradeId: string,
  screenshotId: string,
): Promise<(JournalScreenshotResponse & { storageKey: string }) | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(journalTradeScreenshots)
    .where(
      and(
        eq(journalTradeScreenshots.id, screenshotId),
        eq(journalTradeScreenshots.tradeId, tradeId),
        eq(journalTradeScreenshots.userId, userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...rowToResponse(row), storageKey: row.storageKey };
}

export async function readJournalTradeScreenshotBytes(
  userId: string,
  tradeId: string,
  screenshotId: string,
): Promise<{ bytes: Buffer; mimeType: JournalScreenshotMimeType } | null> {
  const row = await getJournalTradeScreenshotById(userId, tradeId, screenshotId);
  if (!row) return null;
  const bytes = await readJournalScreenshotFile(row.storageKey);
  return { bytes, mimeType: row.mimeType };
}

export async function patchJournalTradeScreenshot(
  userId: string,
  tradeId: string,
  screenshotId: string,
  patch: JournalScreenshotPatch,
): Promise<JournalScreenshotResponse | null> {
  const existing = await getJournalTradeScreenshotById(userId, tradeId, screenshotId);
  if (!existing) return null;

  const db = getDb();
  const rows = await db
    .update(journalTradeScreenshots)
    .set({
      caption: patch.caption !== undefined ? patch.caption : existing.caption,
      sortIndex: patch.sortIndex !== undefined ? patch.sortIndex : existing.sortIndex,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(journalTradeScreenshots.id, screenshotId),
        eq(journalTradeScreenshots.tradeId, tradeId),
        eq(journalTradeScreenshots.userId, userId),
      ),
    )
    .returning();
  const row = rows[0];
  if (!row) return null;
  return rowToResponse(row);
}

export async function deleteJournalTradeScreenshot(
  userId: string,
  tradeId: string,
  screenshotId: string,
): Promise<boolean> {
  const existing = await getJournalTradeScreenshotById(userId, tradeId, screenshotId);
  if (!existing) return false;

  const db = getDb();
  await db
    .delete(journalTradeScreenshots)
    .where(
      and(
        eq(journalTradeScreenshots.id, screenshotId),
        eq(journalTradeScreenshots.tradeId, tradeId),
        eq(journalTradeScreenshots.userId, userId),
      ),
    );
  await deleteJournalScreenshotFile(existing.storageKey);
  return true;
}
