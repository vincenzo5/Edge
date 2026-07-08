import { describe, expect, it } from "vitest";

import {
  buildJournalFilterChips,
  countActiveJournalFilters,
  formatJournalPeriodLabel,
  isCustomDateRange,
} from "./journalFilterHelpers";
import { EMPTY_JOURNAL_FILTERS } from "./journalStats";

describe("journalFilterHelpers", () => {
  it("returns zero count and no chips for empty filters in dashboard mode", () => {
    expect(countActiveJournalFilters(EMPTY_JOURNAL_FILTERS, { mode: "dashboard" })).toBe(0);
    expect(buildJournalFilterChips(EMPTY_JOURNAL_FILTERS, { mode: "dashboard" })).toEqual([]);
  });

  it("counts setup and outcome chips with correct labels", () => {
    const filters = { ...EMPTY_JOURNAL_FILTERS, setup: "breakout" as const, outcome: "win" as const };
    expect(countActiveJournalFilters(filters, { mode: "dashboard" })).toBe(2);
    expect(buildJournalFilterChips(filters, { mode: "dashboard" }).map((chip) => chip.label)).toEqual([
      "breakout",
      "Wins",
    ]);
  });

  it("detects custom date range and formats period label", () => {
    const filters = { ...EMPTY_JOURNAL_FILTERS, closedFrom: "2026-07-01", closedTo: "2026-07-07" };
    expect(isCustomDateRange(filters)).toBe(true);
    expect(formatJournalPeriodLabel("30d", filters)).toMatch(/Jul/);
    expect(buildJournalFilterChips(filters, { mode: "dashboard" })).toHaveLength(1);
  });

  it("returns clearPatch that resets a single chip field", () => {
    const [chip] = buildJournalFilterChips(
      { ...EMPTY_JOURNAL_FILTERS, setup: "pullback" },
      { mode: "dashboard" },
    );
    expect(chip.clearPatch).toEqual({ setup: "all" });
  });

  it("includes status chip in trades mode when status is not all", () => {
    const filters = { ...EMPTY_JOURNAL_FILTERS, status: "open" as const };
    expect(countActiveJournalFilters(filters, { mode: "trades" })).toBe(1);
    expect(buildJournalFilterChips(filters, { mode: "trades" })[0]?.label).toBe("Open");
  });

  it("ignores status in dashboard mode", () => {
    const filters = { ...EMPTY_JOURNAL_FILTERS, status: "closed" as const };
    expect(countActiveJournalFilters(filters, { mode: "dashboard" })).toBe(0);
  });
});
