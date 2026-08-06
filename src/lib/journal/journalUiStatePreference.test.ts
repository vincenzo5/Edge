import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  JOURNAL_UI_STATE_STORAGE_KEY,
  clearJournalUiScope,
  defaultJournalUiState,
  patchJournalUiState,
  readJournalUiState,
  writeJournalUiState,
} from "./journalUiStatePreference";

describe("journalUiStatePreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    const state = readJournalUiState();
    expect(state.filters).toEqual(defaultJournalUiState().filters);
    expect(state.window).toBe("all");
    expect(state.sort).toEqual({ key: "activity", direction: "desc" });
    expect(state.metricUnit).toBe("usd");
    expect(state.comparePreset).toBe("wins_vs_losses");
  });

  it("round-trips filters and window", () => {
    writeJournalUiState({
      ...defaultJournalUiState(),
      filters: {
        status: "closed",
        setup: "breakout",
        outcome: "win",
        rating: 4,
        symbol: "AAPL",
        tag: "gap",
        closedFrom: "2026-06-01",
        closedTo: "2026-06-30",
      },
      window: "30d",
    });

    const state = readJournalUiState();
    expect(state.window).toBe("30d");
    expect(state.filters.symbol).toBe("AAPL");
    expect(state.filters.setup).toBe("breakout");
    expect(state.filters.outcome).toBe("win");
    expect(state.filters.rating).toBe(4);
    expect(state.filters.tag).toBe("gap");
    expect(state.filters.closedFrom).toBe("2026-06-01");
    expect(state.filters.closedTo).toBe("2026-06-30");
    expect(state.filters.closedDate).toBeUndefined();
    expect(state.filters.includeIgnored).toBeUndefined();
  });

  it("strips closedDate and includeIgnored on write", () => {
    writeJournalUiState({
      ...defaultJournalUiState(),
      filters: {
        setup: "pullback",
        closedDate: "2026-06-15",
        includeIgnored: true,
      },
    });
    const raw = JSON.parse(localStorage.getItem(JOURNAL_UI_STATE_STORAGE_KEY) ?? "{}");
    expect(raw.filters.closedDate).toBeUndefined();
    expect(raw.filters.includeIgnored).toBeUndefined();
  });

  it("patches without clobbering unrelated fields", () => {
    writeJournalUiState({
      ...defaultJournalUiState(),
      metricUnit: "r",
      comparePreset: "high_vs_low_rating",
      sort: { key: "symbol", direction: "asc" },
    });
    patchJournalUiState({ window: "7d", filters: { symbol: "MSFT", setup: "all" } });
    const state = readJournalUiState();
    expect(state.window).toBe("7d");
    expect(state.filters.symbol).toBe("MSFT");
    expect(state.metricUnit).toBe("r");
    expect(state.comparePreset).toBe("high_vs_low_rating");
    expect(state.sort).toEqual({ key: "symbol", direction: "asc" });
  });

  it("clearJournalUiScope resets filters and window only", () => {
    writeJournalUiState({
      ...defaultJournalUiState(),
      filters: { symbol: "AAPL", setup: "breakout" },
      window: "today",
      metricUnit: "pct",
      sort: { key: "netPnL", direction: "asc" },
    });
    clearJournalUiScope();
    const state = readJournalUiState();
    expect(state.filters.symbol).toBeUndefined();
    expect(state.filters.setup).toBe("all");
    expect(state.window).toBe("all");
    expect(state.metricUnit).toBe("pct");
    expect(state.sort).toEqual({ key: "netPnL", direction: "asc" });
  });

  it("falls back to defaults on corrupt storage", () => {
    localStorage.setItem(JOURNAL_UI_STATE_STORAGE_KEY, "{not-json");
    expect(readJournalUiState().window).toBe("all");
  });
});
