const DEFAULT_RETENTION_DAYS = 90;

export function getTradingAuditRetentionDays(): number {
  const raw = process.env.EDGE_AUDIT_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RETENTION_DAYS;
  }
  return parsed;
}

export function tradingAuditRetentionCutoffMs(nowMs = Date.now()): number {
  const days = getTradingAuditRetentionDays();
  return nowMs - days * 24 * 60 * 60 * 1000;
}
