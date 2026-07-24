import "server-only";

import { and, asc, eq, max, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { journalTradeChartSnapshots, journalTrades } from "@/db/schema";
import {
  jsonByteLength,
  validateJournalChartSnapshotPayload,
} from "@/lib/journal/chartSnapshotValidation";
import type {
  JournalChartSnapshotCreate,
  JournalChartSnapshotPatch,
  JournalChartSnapshotResponse,
  JournalTradePlanLevels,
} from "@/lib/persistence/schemas/journal";
import type { CellConfig } from "@/lib/chartConfig";
import { PersistenceOwnershipError } from "@/lib/persistence/common";
import { getJournalTradeScreenshotById } from "@/lib/persistence/repositories/journalScreenshotRepository";

function rowToResponse(
  row: typeof journalTradeChartSnapshots.$inferSelect,
): JournalChartSnapshotResponse {
  return {
    id: row.id,
    tradeId: row.tradeId,
    sortIndex: row.sortIndex,
    label: row.label,
    symbol: row.symbol,
    interval: row.interval,
    cellConfig: row.cellConfig as CellConfig,
    planLevels: (row.planLevels as JournalTradePlanLevels | null) ?? null,
    screenshotId: row.screenshotId,
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

export async function listJournalTradeChartSnapshots(
  userId: string,
  tradeId: string,
): Promise<JournalChartSnapshotResponse[]> {
  if (!(await assertTradeOwned(userId, tradeId))) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(journalTradeChartSnapshots)
    .where(
      and(
        eq(journalTradeChartSnapshots.userId, userId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
      ),
    )
    .orderBy(
      asc(journalTradeChartSnapshots.sortIndex),
      asc(journalTradeChartSnapshots.createdAt),
    );
  return rows.map(rowToResponse);
}

export async function countJournalTradeChartSnapshots(
  userId: string,
  tradeId: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalTradeChartSnapshots)
    .where(
      and(
        eq(journalTradeChartSnapshots.userId, userId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function createJournalTradeChartSnapshot(
  userId: string,
  tradeId: string,
  input: JournalChartSnapshotCreate,
): Promise<JournalChartSnapshotResponse | null> {
  if (!(await assertTradeOwned(userId, tradeId))) return null;

  if (input.screenshotId) {
    const screenshot = await getJournalTradeScreenshotById(userId, tradeId, input.screenshotId);
    if (!screenshot) {
      throw new PersistenceOwnershipError("Screenshot not found or not owned by the user.");
    }
  }

  const existingCount = await countJournalTradeChartSnapshots(userId, tradeId);
  const payloadBytes = jsonByteLength(input.cellConfig);
  const validated = validateJournalChartSnapshotPayload(payloadBytes, existingCount);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const db = getDb();
  const maxSortRows = await db
    .select({ maxSort: max(journalTradeChartSnapshots.sortIndex) })
    .from(journalTradeChartSnapshots)
    .where(
      and(
        eq(journalTradeChartSnapshots.userId, userId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
      ),
    );
  const nextSortIndex = (maxSortRows[0]?.maxSort ?? -1) + 1;

  const snapshotId = randomUUID();
  const now = new Date();
  const rows = await db
    .insert(journalTradeChartSnapshots)
    .values({
      id: snapshotId,
      userId,
      tradeId,
      sortIndex: nextSortIndex,
      label: input.label?.trim() || null,
      symbol: input.cellConfig.symbol.trim().toUpperCase(),
      interval: input.cellConfig.interval,
      cellConfig: input.cellConfig as CellConfig,
      cellConfigOriginal: input.cellConfig as CellConfig,
      planLevels: input.planLevels ?? null,
      screenshotId: input.screenshotId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const row = rows[0];
  if (!row) return null;
  return rowToResponse(row);
}

export async function getJournalTradeChartSnapshotById(
  userId: string,
  tradeId: string,
  snapshotId: string,
): Promise<(JournalChartSnapshotResponse & { cellConfigOriginal: CellConfig }) | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(journalTradeChartSnapshots)
    .where(
      and(
        eq(journalTradeChartSnapshots.id, snapshotId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
        eq(journalTradeChartSnapshots.userId, userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...rowToResponse(row),
    cellConfigOriginal: row.cellConfigOriginal as CellConfig,
  };
}

export async function patchJournalTradeChartSnapshot(
  userId: string,
  tradeId: string,
  snapshotId: string,
  patch: JournalChartSnapshotPatch,
): Promise<JournalChartSnapshotResponse | null> {
  const existing = await getJournalTradeChartSnapshotById(userId, tradeId, snapshotId);
  if (!existing) return null;

  let nextCellConfig = existing.cellConfig as CellConfig;
  if (patch.resetToOriginal) {
    nextCellConfig = existing.cellConfigOriginal as CellConfig;
  } else if (patch.cellConfig) {
    const payloadBytes = jsonByteLength(patch.cellConfig);
    const validated = validateJournalChartSnapshotPayload(payloadBytes, 0);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    nextCellConfig = patch.cellConfig as CellConfig;
  }

  const db = getDb();
  const rows = await db
    .update(journalTradeChartSnapshots)
    .set({
      cellConfig: nextCellConfig,
      label: patch.label !== undefined ? patch.label : existing.label,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(journalTradeChartSnapshots.id, snapshotId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
        eq(journalTradeChartSnapshots.userId, userId),
      ),
    )
    .returning();
  const row = rows[0];
  if (!row) return null;
  return rowToResponse(row);
}

export async function deleteJournalTradeChartSnapshot(
  userId: string,
  tradeId: string,
  snapshotId: string,
): Promise<boolean> {
  const existing = await getJournalTradeChartSnapshotById(userId, tradeId, snapshotId);
  if (!existing) return false;

  const db = getDb();
  await db
    .delete(journalTradeChartSnapshots)
    .where(
      and(
        eq(journalTradeChartSnapshots.id, snapshotId),
        eq(journalTradeChartSnapshots.tradeId, tradeId),
        eq(journalTradeChartSnapshots.userId, userId),
      ),
    );
  return true;
}
