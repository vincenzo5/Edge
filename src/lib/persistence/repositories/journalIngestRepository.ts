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
import type { JournalFill, JournalImportResult, JournalTrade } from "@/lib/journal/types";
import type {
  JournalFillAccountIndexEntry,
  JournalFillInput,
  JournalFillResponse,
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

export function tradeToResponse(
  row: typeof journalTrades.$inferSelect,
  fillExecIds: string[],
): JournalTradeResponse {
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
        initialStop: trade.initialStop ?? null,
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
