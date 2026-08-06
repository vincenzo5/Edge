import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { journalFills, journalTrades } from "@/db/schema";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";
import { applyInitialStopPlannedRisk } from "@/lib/journal/tradeRiskGeometry";
import type {
  JournalTradePatch,
  JournalTradeResponse,
  ManagePlaybookJournal,
} from "@/lib/persistence/schemas/journal";

export {
  getJournalTradeById,
  importJournalFillsAndRebuild,
  listJournalFillAccountIndex,
  listJournalFills,
  listJournalTrades,
  rebuildJournalTrades,
  tradeToResponse,
  upsertJournalFills,
} from "@/lib/persistence/repositories/journalIngestRepository";

import {
  getJournalTradeById,
  tradeToResponse,
} from "@/lib/persistence/repositories/journalIngestRepository";

async function loadFillQuantitiesForExecIds(
  userId: string,
  execIds: string[],
): Promise<number[]> {
  if (execIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({ quantity: journalFills.quantity })
    .from(journalFills)
    .where(and(eq(journalFills.userId, userId), inArray(journalFills.execId, execIds)));
  return rows.map((row) => row.quantity);
}

export async function patchJournalTrade(
  userId: string,
  tradeId: string,
  patch: JournalTradePatch,
): Promise<JournalTradeResponse | null> {
  const existing = await getJournalTradeById(userId, tradeId);
  if (!existing) return null;

  let nextMode =
    patch.plannedRiskMode !== undefined ? patch.plannedRiskMode : existing.plannedRiskMode;
  let nextValue =
    patch.plannedRiskValue !== undefined ? patch.plannedRiskValue : existing.plannedRiskValue;
  let nextInitialStop =
    patch.initialStop !== undefined ? patch.initialStop : existing.initialStop ?? null;
  let nextPlannedRiskUsd = existing.plannedRiskUsd ?? null;

  if (patch.initialStop !== undefined) {
    // Closed trades store netQuantity=0; resolve size from linked fills (same as client preview).
    const fillQuantities =
      (existing.netQuantity == null || existing.netQuantity === 0) &&
      existing.fillExecIds.length > 0
        ? await loadFillQuantitiesForExecIds(userId, existing.fillExecIds)
        : undefined;
    const applied = applyInitialStopPlannedRisk(
      {
        direction: existing.direction,
        avgEntry: existing.avgEntry,
        netQuantity: existing.netQuantity,
        legs: existing.legs,
        managePlaybook: existing.managePlaybook,
        fillQuantities,
      },
      patch.initialStop,
    );
    nextInitialStop = applied.initialStop;
    nextMode = applied.plannedRiskMode;
    nextValue = applied.plannedRiskValue;
    nextPlannedRiskUsd = applied.plannedRiskUsd;
  } else if (patch.plannedRiskMode !== undefined || patch.plannedRiskValue !== undefined) {
    nextPlannedRiskUsd = computePlannedRiskUsd(existing, nextMode ?? null, nextValue ?? null);
  }

  const db = getDb();
  const rows = await db
    .update(journalTrades)
    .set({
      tags: patch.tags ?? existing.tags ?? [],
      setup: patch.setup !== undefined ? patch.setup : existing.setup,
      reviewNote: patch.reviewNote !== undefined ? patch.reviewNote : existing.reviewNote,
      plannedRiskMode: nextMode ?? null,
      plannedRiskValue: nextValue ?? null,
      plannedRiskUsd: nextPlannedRiskUsd,
      initialStop: nextInitialStop,
      rating: patch.rating !== undefined ? patch.rating : existing.rating ?? null,
      ignored: patch.ignored !== undefined ? patch.ignored : existing.ignored ?? false,
      mfeUsd: patch.mfeUsd !== undefined ? patch.mfeUsd : existing.mfeUsd ?? null,
      mfaUsd: patch.mfaUsd !== undefined ? patch.mfaUsd : existing.mfaUsd ?? null,
      excursionInterval:
        patch.excursionInterval !== undefined
          ? patch.excursionInterval
          : existing.excursionInterval ?? null,
      excursionComputedAt:
        patch.excursionComputedAt !== undefined
          ? patch.excursionComputedAt != null
            ? new Date(patch.excursionComputedAt)
            : null
          : patch.mfeUsd !== undefined || patch.mfaUsd !== undefined
            ? new Date()
            : existing.excursionComputedAt
              ? new Date(existing.excursionComputedAt)
              : null,
      updatedAt: new Date(),
    })
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .returning();
  const row = rows[0];
  if (!row) return null;
  return tradeToResponse(row, existing.fillExecIds);
}

export async function patchJournalTradeManagePlaybook(
  userId: string,
  tradeId: string,
  managePlaybook: ManagePlaybookJournal,
): Promise<JournalTradeResponse | null> {
  const existing = await getJournalTradeById(userId, tradeId);
  if (!existing) return null;

  const db = getDb();
  const rows = await db
    .update(journalTrades)
    .set({
      managePlaybook,
      riskPolicyInstanceId: managePlaybook.instanceId,
      updatedAt: new Date(),
    })
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .returning();
  const row = rows[0];
  if (!row) return null;
  return tradeToResponse(row, existing.fillExecIds);
}
