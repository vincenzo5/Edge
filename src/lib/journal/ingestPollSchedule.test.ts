import { describe, expect, it } from "vitest";
import {
  ingestLedgerChanged,
  JOURNAL_INGEST_POLL_BASE_MS,
  JOURNAL_INGEST_POLL_MAX_MS,
  nextJournalIngestPollDelayMs,
} from "./ingestPollSchedule";

describe("ingestPollSchedule", () => {
  it("resets poll delay on success", () => {
    expect(nextJournalIngestPollDelayMs(JOURNAL_INGEST_POLL_MAX_MS, true)).toBe(
      JOURNAL_INGEST_POLL_BASE_MS,
    );
  });

  it("doubles poll delay on failure up to the cap", () => {
    expect(nextJournalIngestPollDelayMs(JOURNAL_INGEST_POLL_BASE_MS, false)).toBe(60_000);
    expect(nextJournalIngestPollDelayMs(120_000, false)).toBe(240_000);
    expect(nextJournalIngestPollDelayMs(JOURNAL_INGEST_POLL_MAX_MS, false)).toBe(
      JOURNAL_INGEST_POLL_MAX_MS,
    );
  });

  it("detects ledger changes from added fills or flex backfill", () => {
    expect(ingestLedgerChanged(undefined)).toBe(false);
    expect(ingestLedgerChanged([])).toBe(false);
    expect(ingestLedgerChanged([{ skipped: true, added: 1 }])).toBe(false);
    expect(ingestLedgerChanged([{ added: 0, duplicates: 2 }])).toBe(false);
    expect(ingestLedgerChanged([{ added: 1 }])).toBe(true);
    expect(ingestLedgerChanged([{ flexBackfilled: true }])).toBe(true);
  });
});
