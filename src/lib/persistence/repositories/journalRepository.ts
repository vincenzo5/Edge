import "server-only";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db";
import {
  journalFills,
  journalTradeChartSnapshots,
  journalTradeFills,
  journalTradeScreenshots,
  journalTrades,
} from "@/db/schema";
import {
  buildTradeIdRemap,
  remapAttachmentTradeId,
} from "@/lib/journal/preserveTradeAttachments";
import { rebuildTrades } from "@/lib/journal/rebuildTrades";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";
import { applyInitialStopPlannedRisk } from "@/lib/journal/tradeRiskGeometry";
import type { JournalFill, JournalImportResult, JournalTrade } from "@/lib/journal/types";
import type {
  JournalFillAccountIndexEntry,
  JournalFillInput,
  JournalFillResponse,
  JournalTradePatch,
  JournalTradeResponse,
  ManagePlaybookJournal,
} from "@/lib/persistence/schemas/journal";
import { managePlaybookJournalSchema } from "@/lib/persistence/schemas/journal";

function fillToResponse(row: typeof journalFills.$inferSelect): JournalFillResponse {
  return {
    id: row.id,
    execId: row.execId,
    account: row.account,
    fillTime: row.fillTime.toISOString(),
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    avgPrice: row.avgPrice,
    orderId: row.orderId,
    permId: row.permId,
    orderRef: row.orderRef,
    exchange: row.exchange,
    contract: row.contract as JournalFillResponse["contract"],
    commission: row.commission,
    commissionCurrency: row.commissionCurrency,
    realizedPNL: row.realizedPnl,
    source: row.source as JournalFillResponse["source"],
    createdAt: row.createdAt.toISOString(),
  };
}

function tradeToResponse(row: typeof journalTrades.$inferSelect, fillExecIds: string[]): JournalTradeResponse {
  return {
    id: row.id,
    status: row.status as JournalTradeResponse["status"],
    direction: row.direction as JournalTradeResponse["direction"],
    symbol: row.symbol,
    secType: row.secType,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    netQuantity: row.netQuantity,
    avgEntry: row.avgEntry,
    avgExit: row.avgExit,
    grossPnL: row.grossPnl,
    netPnL: row.netPnl,
    totalCommission: row.totalCommission,
    legs: row.legs as JournalTradeResponse["legs"],
    fillExecIds,
    tags: (row.tags as string[] | null) ?? [],
    setup: row.setup as JournalTradeResponse["setup"],
    reviewNote: row.reviewNote,
    plannedRiskMode: row.plannedRiskMode as JournalTradeResponse["plannedRiskMode"],
    plannedRiskValue: row.plannedRiskValue,
    plannedRiskUsd: row.plannedRiskUsd,
    initialStop: row.initialStop,
    rating: row.rating as JournalTradeResponse["rating"],
    ignored: row.ignored ?? false,
    mfeUsd: row.mfeUsd,
    mfaUsd: row.mfaUsd,
    excursionInterval: row.excursionInterval as JournalTradeResponse["excursionInterval"],
    excursionComputedAt: row.excursionComputedAt?.toISOString() ?? null,
    managePlaybook: parseManagePlaybook(row.managePlaybook),
    riskPolicyInstanceId: row.riskPolicyInstanceId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseManagePlaybook(value: unknown): ManagePlaybookJournal | null {
  if (value == null) return null;
  const parsed = managePlaybookJournalSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function inputToRow(userId: string, input: JournalFillInput) {
  return {
    userId,
    execId: input.execId,
    account: input.account ?? null,
    fillTime: new Date(input.fillTime),
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    avgPrice: input.avgPrice ?? null,
    orderId: input.orderId ?? null,
    permId: input.permId ?? null,
    orderRef: input.orderRef ?? null,
    exchange: input.exchange ?? null,
    contract: input.contract,
    commission: input.commission ?? null,
    commissionCurrency: input.commissionCurrency ?? null,
    realizedPnl: input.realizedPNL ?? null,
    source: input.source,
  };
}

export async function listJournalFills(userId: string): Promise<JournalFillResponse[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(journalFills)
    .where(eq(journalFills.userId, userId))
    .orderBy(desc(journalFills.fillTime));
  return rows.map(fillToResponse);
}

export async function listJournalFillAccountIndex(
  userId: string,
  execIds: string[],
): Promise<JournalFillAccountIndexEntry[]> {
  if (execIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      execId: journalFills.execId,
      account: journalFills.account,
    })
    .from(journalFills)
    .where(and(eq(journalFills.userId, userId), inArray(journalFills.execId, execIds)));
  return rows.map((row) => ({
    execId: row.execId,
    account: row.account?.trim() ?? null,
  }));
}

export async function upsertJournalFills(
  userId: string,
  inputs: JournalFillInput[],
): Promise<{ fills: JournalFillResponse[]; imported: number; duplicates: number }> {
  const db = getDb();
  const existingRows = await db
    .select({ execId: journalFills.execId })
    .from(journalFills)
    .where(eq(journalFills.userId, userId));
  const existingExecIds = new Set(existingRows.map((row) => row.execId));

  for (const input of inputs) {
    const values = inputToRow(userId, input);
    await db
      .insert(journalFills)
      .values(values)
      .onConflictDoUpdate({
        target: [journalFills.userId, journalFills.execId],
        set: {
          account: values.account,
          fillTime: values.fillTime,
          side: values.side,
          quantity: values.quantity,
          price: values.price,
          avgPrice: values.avgPrice,
          orderId: values.orderId,
          permId: values.permId,
          orderRef: values.orderRef,
          exchange: values.exchange,
          contract: values.contract,
          commission: values.commission,
          commissionCurrency: values.commissionCurrency,
          realizedPnl: values.realizedPnl,
          source: values.source,
        },
      });
  }

  const imported = inputs.filter((input) => !existingExecIds.has(input.execId)).length;
  const fills = await listJournalFills(userId);
  return {
    fills,
    imported,
    duplicates: inputs.length - imported,
  };
}

async function loadFillExecIdsByTrade(userId: string, tradeIds: string[]): Promise<Map<string, string[]>> {
  if (tradeIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({
      tradeId: journalTradeFills.tradeId,
      execId: journalFills.execId,
    })
    .from(journalTradeFills)
    .innerJoin(journalFills, eq(journalTradeFills.fillId, journalFills.id))
    .where(and(eq(journalFills.userId, userId), inArray(journalTradeFills.tradeId, tradeIds)));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.tradeId) ?? [];
    list.push(row.execId);
    map.set(row.tradeId, list);
  }
  return map;
}

export async function listJournalTrades(
  userId: string,
  query: {
    status?: "open" | "closed" | "all";
    symbol?: string;
    secType?: string;
    tag?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
): Promise<JournalTradeResponse[]> {
  const db = getDb();
  const filters = [eq(journalTrades.userId, userId)];
  if (query.status && query.status !== "all") filters.push(eq(journalTrades.status, query.status));
  if (query.symbol) filters.push(eq(journalTrades.symbol, query.symbol.toUpperCase()));
  if (query.secType) filters.push(eq(journalTrades.secType, query.secType.toUpperCase()));
  if (query.from) filters.push(gte(journalTrades.openedAt, new Date(query.from)));
  if (query.to) filters.push(lte(journalTrades.openedAt, new Date(query.to)));

  const rows = await db
    .select()
    .from(journalTrades)
    .where(and(...filters))
    .orderBy(desc(journalTrades.openedAt))
    .limit(query.limit ?? 200);

  const execMap = await loadFillExecIdsByTrade(
    userId,
    rows.map((row) => row.id),
  );

  const filtered = query.tag
    ? rows.filter((row) => ((row.tags as string[] | null) ?? []).includes(query.tag!))
    : rows;

  return filtered.map((row) => tradeToResponse(row, execMap.get(row.id) ?? []));
}

export async function getJournalTradeById(
  userId: string,
  tradeId: string,
): Promise<JournalTradeResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const execMap = await loadFillExecIdsByTrade(userId, [row.id]);
  return tradeToResponse(row, execMap.get(row.id) ?? []);
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
    const applied = applyInitialStopPlannedRisk(existing, patch.initialStop);
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

export async function rebuildJournalTrades(userId: string): Promise<JournalImportResult> {
  const db = getDb();
  const fillRows = await db
    .select()
    .from(journalFills)
    .where(eq(journalFills.userId, userId))
    .orderBy(journalFills.fillTime);

  const fills: JournalFill[] = fillRows.map((row) => ({
    id: row.id,
    execId: row.execId,
    account: row.account,
    fillTime: row.fillTime.toISOString(),
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    avgPrice: row.avgPrice,
    orderId: row.orderId,
    permId: row.permId,
    orderRef: row.orderRef,
    exchange: row.exchange,
    contract: row.contract as JournalFill["contract"],
    commission: row.commission,
    commissionCurrency: row.commissionCurrency,
    realizedPNL: row.realizedPnl,
    source: row.source as JournalFill["source"],
    createdAt: row.createdAt.toISOString(),
  }));

  const previousTrades = await listJournalTrades(userId, { limit: 5000 });
  const { trades } = rebuildTrades(fills, previousTrades as JournalTrade[]);
  const tradeIdRemap = buildTradeIdRemap(
    previousTrades as JournalTrade[],
    trades,
  );

  // Snapshot attachments before delete — trade DELETE CASCADE would wipe them.
  const screenshotRows = await db
    .select()
    .from(journalTradeScreenshots)
    .where(eq(journalTradeScreenshots.userId, userId));
  const chartSnapshotRows = await db
    .select()
    .from(journalTradeChartSnapshots)
    .where(eq(journalTradeChartSnapshots.userId, userId));

  const existingTradeRows = await db
    .select({ id: journalTrades.id })
    .from(journalTrades)
    .where(eq(journalTrades.userId, userId));
  const existingTradeIds = existingTradeRows.map((row) => row.id);
  if (existingTradeIds.length > 0) {
    await db.delete(journalTradeFills).where(inArray(journalTradeFills.tradeId, existingTradeIds));
    await db.delete(journalTrades).where(eq(journalTrades.userId, userId));
  }

  for (const trade of trades) {
    const inserted = await db
      .insert(journalTrades)
      .values({
        id: trade.id,
        userId,
        status: trade.status,
        direction: trade.direction,
        symbol: trade.symbol,
        secType: trade.secType,
        openedAt: new Date(trade.openedAt),
        closedAt: trade.closedAt ? new Date(trade.closedAt) : null,
        netQuantity: trade.netQuantity ?? null,
        avgEntry: trade.avgEntry ?? null,
        avgExit: trade.avgExit ?? null,
        grossPnl: trade.grossPnL ?? null,
        netPnl: trade.netPnL ?? null,
        totalCommission: trade.totalCommission ?? null,
        legs: trade.legs ?? null,
        tags: trade.tags ?? [],
        setup: trade.setup ?? null,
        reviewNote: trade.reviewNote ?? null,
        plannedRiskMode: trade.plannedRiskMode ?? null,
        plannedRiskValue: trade.plannedRiskValue ?? null,
        plannedRiskUsd: trade.plannedRiskUsd ?? null,
        rating: trade.rating ?? null,
        ignored: trade.ignored ?? false,
        mfeUsd: trade.mfeUsd ?? null,
        mfaUsd: trade.mfaUsd ?? null,
        excursionInterval: trade.excursionInterval ?? null,
        excursionComputedAt: trade.excursionComputedAt
          ? new Date(trade.excursionComputedAt)
          : null,
        managePlaybook: trade.managePlaybook ?? null,
      })
      .returning();

    const tradeRow = inserted[0];
    if (!tradeRow) continue;

    const linkedExecIds = trade.fillExecIds;
    if (linkedExecIds.length === 0) continue;
    const fillIdRows = await db
      .select({ id: journalFills.id, execId: journalFills.execId })
      .from(journalFills)
      .where(and(eq(journalFills.userId, userId), inArray(journalFills.execId, linkedExecIds)));

    for (const fillRow of fillIdRows) {
      const role =
        trade.fillLinks?.find((link) => link.execId === fillRow.execId)?.role ?? "open";
      await db.insert(journalTradeFills).values({
        tradeId: tradeRow.id,
        fillId: fillRow.id,
        role,
      });
    }
  }

  // Restore screenshots first so chart-snapshot screenshot_id FKs still resolve.
  for (const shot of screenshotRows) {
    const nextTradeId = remapAttachmentTradeId(shot.tradeId, tradeIdRemap);
    if (!nextTradeId) continue;
    await db.insert(journalTradeScreenshots).values({
      ...shot,
      tradeId: nextTradeId,
    });
  }

  for (const snapshot of chartSnapshotRows) {
    const nextTradeId = remapAttachmentTradeId(snapshot.tradeId, tradeIdRemap);
    if (!nextTradeId) continue;
    await db.insert(journalTradeChartSnapshots).values({
      ...snapshot,
      tradeId: nextTradeId,
    });
  }

  return {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    tradesRebuilt: trades.length,
  };
}

export async function importJournalFillsAndRebuild(
  userId: string,
  inputs: JournalFillInput[],
): Promise<JournalImportResult & { fills: JournalFillResponse[] }> {
  const upsert = await upsertJournalFills(userId, inputs);
  const rebuilt = await rebuildJournalTrades(userId);
  return {
    fills: upsert.fills,
    imported: upsert.imported,
    duplicates: upsert.duplicates,
    skipped: 0,
    tradesRebuilt: rebuilt.tradesRebuilt,
  };
}
