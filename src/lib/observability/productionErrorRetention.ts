const DEFAULT_RETENTION_DAYS = 30;

export function getProductionErrorRetentionDays(): number {
  const raw = process.env.EDGE_ERROR_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RETENTION_DAYS;
  }
  return parsed;
}

export function productionErrorRetentionCutoffMs(nowMs = Date.now()): number {
  const days = getProductionErrorRetentionDays();
  return nowMs - days * 24 * 60 * 60 * 1000;
}
