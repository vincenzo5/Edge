export const JOURNAL_CHART_SNAPSHOT_MAX_BYTES = 512 * 1024;
export const JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE = 5;

export function validateJournalChartSnapshotPayload(
  jsonByteLength: number,
  existingCount: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(jsonByteLength) || jsonByteLength <= 0) {
    return { ok: false, error: "Chart snapshot payload is empty." };
  }
  if (jsonByteLength > JOURNAL_CHART_SNAPSHOT_MAX_BYTES) {
    return {
      ok: false,
      error: `Chart snapshot exceeds ${JOURNAL_CHART_SNAPSHOT_MAX_BYTES / 1024} KB limit.`,
    };
  }
  if (existingCount >= JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE) {
    return {
      ok: false,
      error: `Maximum ${JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE} chart snapshots per trade.`,
    };
  }
  return { ok: true };
}

export function jsonByteLength(value: unknown): number {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(json, "utf8");
  }
  return new TextEncoder().encode(json).length;
}
