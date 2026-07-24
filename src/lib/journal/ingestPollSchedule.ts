export const JOURNAL_INGEST_POLL_BASE_MS = 30_000;
export const JOURNAL_INGEST_POLL_MAX_MS = 5 * 60_000;

export type BrokerageIngestClientResult = {
  skipped?: boolean;
  added?: number;
  flexBackfilled?: boolean;
};

export function nextJournalIngestPollDelayMs(
  currentDelayMs: number,
  succeeded: boolean,
): number {
  if (succeeded) return JOURNAL_INGEST_POLL_BASE_MS;
  const doubled = currentDelayMs * 2;
  return Math.min(doubled, JOURNAL_INGEST_POLL_MAX_MS);
}

export function ingestLedgerChanged(
  results: BrokerageIngestClientResult[] | undefined,
): boolean {
  if (!results || results.length === 0) return false;
  return results.some(
    (result) =>
      !result.skipped && ((result.added ?? 0) > 0 || result.flexBackfilled === true),
  );
}

export function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}
