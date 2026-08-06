import { describe, expect, it, beforeEach } from "vitest";

import {
  DEFAULT_JOURNAL_CAPITAL_EVENTS,
  addJournalCapitalEvent,
  normalizeJournalCapitalEvents,
  readJournalCapitalEvents,
  removeJournalCapitalEvent,
  resetJournalCapitalEvents,
  sumJournalNetDeposits,
  writeJournalCapitalEvents,
  JOURNAL_CAPITAL_EVENTS_STORAGE_KEY,
} from "@/lib/journal/journalCapitalPreference";

describe("journalCapitalPreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds default statement deposits when storage is empty", () => {
    const events = readJournalCapitalEvents();
    expect(events).toHaveLength(5);
    expect(sumJournalNetDeposits(events)).toBe(28_000);
  });

  it("sums deposits minus withdrawals", () => {
    const events = normalizeJournalCapitalEvents([
      ...DEFAULT_JOURNAL_CAPITAL_EVENTS,
      {
        id: "withdraw-1",
        date: "2026-07-01",
        amountUsd: 1_000,
        kind: "withdrawal",
        source: "manual",
      },
    ]);
    expect(sumJournalNetDeposits(events)).toBe(27_000);
  });

  it("returns null for empty capital list", () => {
    expect(sumJournalNetDeposits([])).toBeNull();
  });

  it("returns null when net deposits are zero or negative", () => {
    expect(
      sumJournalNetDeposits([
        {
          id: "w1",
          date: "2026-07-01",
          amountUsd: 500,
          kind: "withdrawal",
          source: "manual",
        },
      ]),
    ).toBeNull();
  });

  it("persists manual add and remove", () => {
    addJournalCapitalEvent({ date: "2026-08-01", amountUsd: 2_500 });
    expect(readJournalCapitalEvents()).toHaveLength(6);
    const added = readJournalCapitalEvents().find((event) => event.amountUsd === 2_500);
    expect(added?.source).toBe("manual");
    removeJournalCapitalEvent(added!.id);
    expect(readJournalCapitalEvents()).toHaveLength(5);
  });

  it("reset restores statement seed", () => {
    writeJournalCapitalEvents([]);
    localStorage.setItem(JOURNAL_CAPITAL_EVENTS_STORAGE_KEY, "[]");
    resetJournalCapitalEvents();
    expect(sumJournalNetDeposits(readJournalCapitalEvents())).toBe(28_000);
  });
});
