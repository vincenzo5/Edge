import type { AccountExecution } from "@/lib/marketData/contracts/brokerage";
import { mapExecutionToJournalFill } from "@/lib/journal/mapExecutionToFill";
import type { JournalFillInput } from "@/lib/persistence/schemas/journal";
import type { JournalFillSource } from "@/lib/journal/types";

export const MAX_TRACKED_EXEC_IDS = 200;

export type IngestCursorState = {
  lastExecTime: string | null;
  lastSeenExecIds: string[];
};

function parseExecutionTime(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  const trimmed = raw.trim();
  if (/^\d{8};\d{6}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const mo = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const h = trimmed.slice(9, 11);
    const mi = trimmed.slice(11, 13);
    const s = trimmed.slice(13, 15);
    return Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function executionFingerprint(executions: AccountExecution[]): string {
  const ids = executions
    .map((execution) => execution.execId?.trim())
    .filter((execId): execId is string => Boolean(execId))
    .sort();
  return ids.join("\0");
}

export function executionsToFillInputs(
  executions: AccountExecution[],
  source: JournalFillSource = "live",
): JournalFillInput[] {
  const inputs: JournalFillInput[] = [];
  for (const execution of executions) {
    const fill = mapExecutionToJournalFill(execution, source);
    if (!fill) continue;
    inputs.push({
      execId: fill.execId,
      account: fill.account,
      fillTime: fill.fillTime,
      side: fill.side,
      quantity: fill.quantity,
      price: fill.price,
      avgPrice: fill.avgPrice,
      orderId: fill.orderId,
      permId: fill.permId,
      orderRef: fill.orderRef,
      exchange: fill.exchange,
      contract: fill.contract,
      commission: fill.commission,
      commissionCurrency: fill.commissionCurrency,
      realizedPNL: fill.realizedPNL,
      source: fill.source,
    });
  }
  return inputs;
}

export function advanceCursorFromExecutions(
  cursor: IngestCursorState,
  executions: AccountExecution[],
): IngestCursorState {
  if (executions.length === 0) return cursor;

  let latestMs = cursor.lastExecTime ? Date.parse(cursor.lastExecTime) : 0;
  const seen = new Set(cursor.lastSeenExecIds);

  for (const execution of executions) {
    const execId = execution.execId?.trim();
    if (execId) seen.add(execId);
    const ms = parseExecutionTime(execution.time);
    if (ms > latestMs) latestMs = ms;
  }

  const lastSeenExecIds = [...seen].slice(-MAX_TRACKED_EXEC_IDS);
  return {
    lastExecTime: latestMs > 0 ? new Date(latestMs).toISOString() : cursor.lastExecTime,
    lastSeenExecIds,
  };
}

export function filterNewExecutions(
  executions: AccountExecution[],
  lastSeenExecIds: string[],
): AccountExecution[] {
  const seen = new Set(lastSeenExecIds);
  return executions.filter((execution) => {
    const execId = execution.execId?.trim();
    if (!execId) return false;
    return !seen.has(execId);
  });
}

/** True when cursor is stale and Flex backfill may be warranted. */
export function shouldAttemptFlexGapBackfill(
  cursor: IngestCursorState,
  lastIngestAt: Date | null,
  nowMs: number = Date.now(),
): boolean {
  const gapThresholdMs = 4 * 60 * 60 * 1000;
  const lastActivityMs = lastIngestAt?.getTime() ?? (cursor.lastExecTime ? Date.parse(cursor.lastExecTime) : 0);
  if (lastActivityMs <= 0) return false;
  return nowMs - lastActivityMs >= gapThresholdMs;
}

export function floorToIntervalMs(timestampMs: number, intervalMs: number): number {
  return Math.floor(timestampMs / intervalMs) * intervalMs;
}
