import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addJournalSetupValue,
  DEFAULT_JOURNAL_SETUP_VALUES,
  JOURNAL_SETUP_VALUES_STORAGE_KEY,
  normalizeJournalSetupValues,
  readJournalSetupValues,
  removeJournalSetupValue,
  renameJournalSetupValue,
  reorderJournalSetupValues,
  resetJournalSetupValues,
  subscribeJournalSetupValues,
  writeJournalSetupValues,
} from "./journalSetupPreference";

vi.mock("@/lib/userPreferences/userPreferencesSync", () => ({
  notifyUserPreferencesChanged: vi.fn(),
}));

describe("journalSetupPreference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns defaults when storage is empty", () => {
    expect(readJournalSetupValues()).toEqual([...DEFAULT_JOURNAL_SETUP_VALUES]);
  });

  it("normalizes trim, dedupe, and max length", () => {
    expect(
      normalizeJournalSetupValues([" breakout ", "breakout", "  ", "a".repeat(41), "pullback"]),
    ).toEqual(["breakout", "pullback"]);
  });

  it("falls back to defaults when normalization would be empty", () => {
    expect(normalizeJournalSetupValues(["", "   "])).toEqual([...DEFAULT_JOURNAL_SETUP_VALUES]);
  });

  it("writes and reads persisted values", () => {
    writeJournalSetupValues(["VWAP reclaim", "Opening drive"]);
    expect(readJournalSetupValues()).toEqual(["VWAP reclaim", "Opening drive"]);
    expect(localStorage.getItem(JOURNAL_SETUP_VALUES_STORAGE_KEY)).toContain("VWAP reclaim");
  });

  it("notifies subscribers on write", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeJournalSetupValues(listener);
    writeJournalSetupValues(["custom"]);
    expect(listener).toHaveBeenCalledWith(["custom"]);
    unsubscribe();
  });

  it("adds, renames, removes, reorders, and resets", () => {
    resetJournalSetupValues();
    addJournalSetupValue("VWAP reclaim");
    expect(readJournalSetupValues()).toContain("VWAP reclaim");

    renameJournalSetupValue("VWAP reclaim", "VWAP bounce");
    expect(readJournalSetupValues()).toContain("VWAP bounce");
    expect(readJournalSetupValues()).not.toContain("VWAP reclaim");

    removeJournalSetupValue("VWAP bounce");
    expect(readJournalSetupValues()).not.toContain("VWAP bounce");

    writeJournalSetupValues(["a", "b", "c"]);
    reorderJournalSetupValues(0, 2);
    expect(readJournalSetupValues()).toEqual(["b", "c", "a"]);

    resetJournalSetupValues();
    expect(readJournalSetupValues()).toEqual([...DEFAULT_JOURNAL_SETUP_VALUES]);
  });

  it("does not remove the last setup value", () => {
    writeJournalSetupValues(["only"]);
    removeJournalSetupValue("only");
    expect(readJournalSetupValues()).toEqual(["only"]);
  });
});
