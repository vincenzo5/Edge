import "server-only";

import { isDatabaseConfigured } from "@/db";
import {
  getBrokerageService,
  isBrokerageConfigured,
  type BrokerageSnapshot,
} from "@/lib/brokerage/brokerageService";
import {
  advanceCursorFromExecutions,
  executionsToFillInputs,
  floorToIntervalMs,
  shouldAttemptFlexGapBackfill,
} from "@/lib/brokerage/ingest/ingestExecutions";
import {
  ACCOUNT_SNAPSHOT_INTERVAL_MS,
  parseAccountSummaryMetrics,
  POSITION_SNAPSHOT_INTERVAL_MS,
  shouldCaptureSnapshot,
} from "@/lib/brokerage/ingest/parseAccountSummary";
import { resolveIngestAccountId } from "@/lib/brokerage/ingest/resolveIngestAccountId";
import { parseFlexCsv } from "@/lib/journal/flexImport/parseFlexCsv";
import {
  fetchFlexStatementCsv,
  readFlexWebServiceConfigFromEnv,
} from "@/lib/journal/flexImport/flexWebService";
import { filterTradesByAccount } from "@/lib/journal/filterTradesByAccount";
import { reconcileJournalOpensWithPositions } from "@/lib/journal/reconcileJournalOpens";
import {
  importJournalFillsAndRebuild,
  listJournalFills,
  listJournalTrades,
} from "@/lib/persistence/repositories/journalRepository";
import {
  getBrokerIngestCursor,
  upsertBrokerIngestCursor,
} from "@/lib/persistence/repositories/brokerIngestRepository";
import { upsertAccountSnapshot, getLatestAccountSnapshot } from "@/lib/persistence/repositories/accountSnapshotRepository";
import {
  getLatestPositionSnapshot,
  upsertPositionSnapshot,
} from "@/lib/persistence/repositories/positionSnapshotRepository";
import { resolveConnectionByEnvironment } from "@/lib/trading/connectionRegistry";
import type { TradingEnvironment } from "@/lib/trading/types";

const MIN_FLEX_BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** When journal is out of sync, still don't hammer Flex more than once per interval. */
const FLEX_RECONCILE_INTERVAL_MS = 15 * 60 * 1000;
const FLEX_FAILURE_BACKOFF_MS = 15 * 60 * 1000;
const FLEX_LOCKOUT_BACKOFF_MS = 60 * 60 * 1000;

export type BrokerageIngestResult = {
  connectionId: string;
  environment: TradingEnvironment;
  skipped: boolean;
  added: number;
  duplicates: number;
  flexBackfilled: boolean;
  snapshotsCaptured: boolean;
  journalInSync: boolean | null;
  error: string | null;
};

async function maybeFlexGapBackfill(
  userId: string,
  connectionId: string,
  cursorRow: Awaited<ReturnType<typeof getBrokerIngestCursor>>["row"],
  cursor: Awaited<ReturnType<typeof getBrokerIngestCursor>>["cursor"],
  options: { forceReconcile?: boolean; accountId?: string | null } = {},
): Promise<{ backfilled: boolean; error: string | null }> {
  const config = readFlexWebServiceConfigFromEnv();
  if (!config) return { backfilled: false, error: null };

  if (!shouldAttemptFlexGapBackfill(cursor, { forceReconcile: options.forceReconcile })) {
    return { backfilled: false, error: null };
  }

  const lastError = cursorRow?.lastIngestError ?? "";
  const lastIngestMs = cursorRow?.lastIngestAt ? Date.parse(cursorRow.lastIngestAt) : 0;
  if (lastError.includes("Flex") && lastIngestMs > 0) {
    const backoffMs = lastError.includes("1025")
      ? FLEX_LOCKOUT_BACKOFF_MS
      : FLEX_FAILURE_BACKOFF_MS;
    if (Date.now() - lastIngestMs < backoffMs) {
      return { backfilled: false, error: lastError };
    }
  }

  const lastFlexMs = cursorRow?.lastFlexBackfillAt
    ? Date.parse(cursorRow.lastFlexBackfillAt)
    : 0;
  const minInterval = options.forceReconcile
    ? FLEX_RECONCILE_INTERVAL_MS
    : MIN_FLEX_BACKFILL_INTERVAL_MS;
  if (lastFlexMs > 0 && Date.now() - lastFlexMs < minInterval) {
    return { backfilled: false, error: null };
  }

  try {
    const fetched = await fetchFlexStatementCsv(config);
    const parsed = parseFlexCsv(fetched.csvText);
    if (parsed.errors.length > 0 || parsed.fills.length === 0) {
      return {
        backfilled: false,
        error: parsed.errors[0] ?? "Flex parse returned no fills",
      };
    }
    await importJournalFillsAndRebuild(userId, parsed.fills);
    await upsertBrokerIngestCursor(userId, connectionId, {
      accountId: options.accountId ?? cursorRow?.accountId ?? null,
      cursor,
      lastFlexBackfillAt: new Date(),
      lastIngestError: null,
    });
    return { backfilled: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flex backfill failed";
    return { backfilled: false, error: message };
  }
}

async function captureSnapshotsIfDue(
  userId: string,
  connectionId: string,
  snapshot: BrokerageSnapshot,
  accountId: string | null,
): Promise<boolean> {
  if (!accountId) return false;

  const nowMs = Date.now();
  const capturedAt = new Date(floorToIntervalMs(nowMs, ACCOUNT_SNAPSHOT_INTERVAL_MS));
  let captured = false;

  const metrics = parseAccountSummaryMetrics(snapshot.summary);
  const latestAccount = await getLatestAccountSnapshot(userId, accountId, connectionId);
  const lastAccountAt = latestAccount ? new Date(latestAccount.capturedAt) : null;
  if (shouldCaptureSnapshot(lastAccountAt, nowMs, ACCOUNT_SNAPSHOT_INTERVAL_MS)) {
    await upsertAccountSnapshot(userId, connectionId, { ...metrics, accountId }, capturedAt);
    captured = true;
  }

  const latestPosition = await getLatestPositionSnapshot(userId, accountId, connectionId);
  const lastPositionAt = latestPosition ? new Date(latestPosition.capturedAt) : null;
  if (shouldCaptureSnapshot(lastPositionAt, nowMs, POSITION_SNAPSHOT_INTERVAL_MS)) {
    await upsertPositionSnapshot(
      userId,
      connectionId,
      accountId,
      snapshot.positions,
      capturedAt,
    );
    captured = true;
  }

  return captured;
}

async function evaluateJournalReconcile(
  userId: string,
  snapshot: BrokerageSnapshot,
  accountId: string | null,
): Promise<boolean | null> {
  if (!accountId) return null;
  const [openTrades, fills] = await Promise.all([
    listJournalTrades(userId, { status: "open", limit: 500 }),
    listJournalFills(userId),
  ]);
  const scopedOpen = filterTradesByAccount(openTrades, fills, accountId);
  const reconcile = reconcileJournalOpensWithPositions(
    scopedOpen,
    snapshot.positions ?? [],
    accountId,
  );
  return reconcile.inSync;
}

export async function runBrokerageIngestForEnvironment(
  userId: string,
  environment: TradingEnvironment,
): Promise<BrokerageIngestResult> {
  const connection = resolveConnectionByEnvironment(environment);
  const base: BrokerageIngestResult = {
    connectionId: connection.connectionId,
    environment,
    skipped: false,
    added: 0,
    duplicates: 0,
    flexBackfilled: false,
    snapshotsCaptured: false,
    journalInSync: null,
    error: null,
  };

  if (!isDatabaseConfigured() || !isBrokerageConfigured()) {
    return { ...base, skipped: true };
  }

  const { cursor, row } = await getBrokerIngestCursor(userId, connection.connectionId);

  try {
    const snapshot = await getBrokerageService().getSnapshot(environment);
    const accountId = resolveIngestAccountId(snapshot, environment);
    const fillInputs = executionsToFillInputs(snapshot.executions, "live");

    let added = 0;
    let duplicates = 0;
    if (fillInputs.length > 0) {
      const upsert = await importJournalFillsAndRebuild(userId, fillInputs);
      added = upsert.imported;
      duplicates = upsert.duplicates;
    }

    const nextCursor = advanceCursorFromExecutions(cursor, snapshot.executions);
    const snapshotsCaptured = await captureSnapshotsIfDue(
      userId,
      connection.connectionId,
      snapshot,
      accountId,
    );

    const journalInSync = await evaluateJournalReconcile(userId, snapshot, accountId);

    await upsertBrokerIngestCursor(userId, connection.connectionId, {
      accountId,
      cursor: nextCursor,
      lastIngestAt: new Date(),
      lastIngestError: null,
    });

    let flexBackfilled = false;
    let flexError: string | null = null;
    // Flex query is account-scoped (live). Paper must not share the same token hammer path.
    const shouldFlex =
      environment === "live" &&
      (fillInputs.length === 0 || journalInSync === false);
    if (shouldFlex) {
      const flex = await maybeFlexGapBackfill(
        userId,
        connection.connectionId,
        row,
        nextCursor,
        {
          forceReconcile: journalInSync === false,
          accountId,
        },
      );
      flexBackfilled = flex.backfilled;
      flexError = flex.error;
      if (flexError) {
        await upsertBrokerIngestCursor(userId, connection.connectionId, {
          accountId,
          cursor: nextCursor,
          lastIngestAt: new Date(),
          lastIngestError: flexError,
        });
      }
    }

    return {
      ...base,
      added,
      duplicates,
      flexBackfilled,
      snapshotsCaptured,
      journalInSync,
      error: flexError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brokerage ingest failed";
    await upsertBrokerIngestCursor(userId, connection.connectionId, {
      accountId: row?.accountId ?? null,
      cursor,
      lastIngestAt: new Date(),
      lastIngestError: message,
    });
    return { ...base, error: message };
  }
}

export async function runBrokerageIngestAll(
  userId: string,
): Promise<BrokerageIngestResult[]> {
  const environments: TradingEnvironment[] = ["paper", "live"];
  const results: BrokerageIngestResult[] = [];
  for (const environment of environments) {
    results.push(await runBrokerageIngestForEnvironment(userId, environment));
  }
  return results;
}
