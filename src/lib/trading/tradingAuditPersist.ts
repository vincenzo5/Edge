import "server-only";

import { isDatabaseConfigured } from "@/db";
import { redactDiagnostic } from "@/lib/api/redactDiagnostic";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  insertTradingAuditEvent,
  purgeTradingAuditEventsOlderThan,
} from "@/lib/persistence/repositories/tradingAuditRepository";
import type { TradingAuditEntry } from "./auditLog";
import { tradingAuditRetentionCutoffMs } from "./tradingAuditRetention";

const DETAIL_MAX_LENGTH = 240;
let lastPurgeAtMs = 0;
const PURGE_INTERVAL_MS = 60_000;

function sanitizeEntryForPersist(entry: TradingAuditEntry): Omit<TradingAuditEntry, "accountId"> {
  let detail = entry.detail
    ? redactDiagnostic(entry.detail, { maxLength: DETAIL_MAX_LENGTH })
    : undefined;
  if (detail && entry.accountId) {
    detail = detail.split(entry.accountId).join("[REDACTED]");
  }

  return {
    at: entry.at,
    action: entry.action,
    outcome: entry.outcome,
    ...(entry.intentId ? { intentId: entry.intentId } : {}),
    ...(entry.orderRef ? { orderRef: entry.orderRef } : {}),
    ...(entry.requestId ? { requestId: entry.requestId } : {}),
    ...(detail ? { detail } : {}),
  };
}

async function maybePurgeOldEvents(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeAtMs < PURGE_INTERVAL_MS) {
    return;
  }
  lastPurgeAtMs = now;
  await purgeTradingAuditEventsOlderThan(tradingAuditRetentionCutoffMs(now));
}

export async function persistTradingAudit(entry: TradingAuditEntry): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  const userId = await ensureDevAppUser();
  const sanitized = sanitizeEntryForPersist(entry);
  await insertTradingAuditEvent(userId, sanitized);
  await maybePurgeOldEvents();
}

export async function purgeTradingAuditRetentionNow(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }
  return purgeTradingAuditEventsOlderThan(tradingAuditRetentionCutoffMs());
}
