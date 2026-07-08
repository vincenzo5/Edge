import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  defaultJournalTradesTablePrefs,
  formatJournalTradesResultLabel,
  paginateJournalTrades,
  readJournalTradesTablePrefs,
  sortJournalTrades,
  toggleJournalTradesTableColumn,
  toggleJournalTradesTableSort,
  writeJournalTradesTablePrefs,
} from "./journalTradesTableControls";

function makeTrade(overrides: Partial<JournalTradeResponse> & Pick<JournalTradeResponse, "id">): JournalTradeResponse {
  return {
    status: "closed",
    direction: "long",
    symbol: "AAPL",
    secType: "STK",
    openedAt: "2026-06-01T13:30:00.000Z",
    closedAt: "2026-06-02T13:30:00.000Z",
    netPnL: 100,
    avgEntry: 150,
    avgExit: 160,
    fillExecIds: ["e1"],
    tags: [],
    setup: null,
    reviewNote: null,
    createdAt: "2026-06-01T13:30:00.000Z",
    updatedAt: "2026-06-02T13:30:00.000Z",
    ...overrides,
  };
}

describe("journalTradesTableControls", () => {
  describe("sortJournalTrades", () => {
    it("sorts by activity desc by default (most recent first)", () => {
      const trades = [
        makeTrade({ id: "old", openedAt: "2026-06-01T13:30:00.000Z", closedAt: "2026-06-02T13:30:00.000Z" }),
        makeTrade({ id: "new", openedAt: "2026-07-01T13:30:00.000Z", closedAt: "2026-07-02T13:30:00.000Z" }),
        makeTrade({
          id: "open",
          status: "open",
          openedAt: "2026-07-03T13:30:00.000Z",
          closedAt: null,
          netPnL: null,
        }),
      ];
      const sorted = sortJournalTrades(trades, DEFAULT_JOURNAL_TRADES_TABLE_SORT);
      expect(sorted.map((t) => t.id)).toEqual(["open", "new", "old"]);
    });

    it("sorts symbol asc with nulls last", () => {
      const trades = [
        makeTrade({ id: "b", symbol: "MSFT" }),
        makeTrade({ id: "a", symbol: "AAPL" }),
      ];
      const sorted = sortJournalTrades(trades, { key: "symbol", direction: "asc" });
      expect(sorted.map((t) => t.symbol)).toEqual(["AAPL", "MSFT"]);
    });

    it("sorts net P&L desc", () => {
      const trades = [
        makeTrade({ id: "low", netPnL: -50 }),
        makeTrade({ id: "high", netPnL: 200 }),
        makeTrade({ id: "mid", netPnL: 10 }),
      ];
      const sorted = sortJournalTrades(trades, { key: "netPnL", direction: "desc" });
      expect(sorted.map((t) => t.id)).toEqual(["high", "mid", "low"]);
    });
  });

  describe("paginateJournalTrades", () => {
    it("returns correct slice and meta", () => {
      const items = Array.from({ length: 47 }, (_, i) => i);
      const result = paginateJournalTrades(items, { page: 2, pageSize: 25 });
      expect(result.items).toHaveLength(22);
      expect(result.meta).toEqual({
        total: 47,
        page: 2,
        pageSize: 25,
        pageCount: 2,
        from: 26,
        to: 47,
      });
    });

    it("clamps page when out of range", () => {
      const result = paginateJournalTrades([1, 2, 3], { page: 99, pageSize: 2 });
      expect(result.meta.page).toBe(2);
      expect(result.items).toEqual([3]);
    });

    it("handles empty list", () => {
      const result = paginateJournalTrades([], { page: 1, pageSize: 50 });
      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        pageSize: 50,
        pageCount: 0,
        from: 0,
        to: 0,
      });
    });
  });

  describe("formatJournalTradesResultLabel", () => {
    it("formats single page", () => {
      expect(
        formatJournalTradesResultLabel({
          total: 12,
          page: 1,
          pageSize: 50,
          pageCount: 1,
          from: 1,
          to: 12,
        }),
      ).toBe("12 trades");
    });

    it("formats paginated range", () => {
      expect(
        formatJournalTradesResultLabel({
          total: 47,
          page: 1,
          pageSize: 25,
          pageCount: 2,
          from: 1,
          to: 25,
        }),
      ).toBe("Showing 1–25 of 47 trades");
    });
  });

  describe("toggleJournalTradesTableSort", () => {
    it("flips direction on same column", () => {
      const current = { key: "symbol" as const, direction: "desc" as const };
      expect(toggleJournalTradesTableSort(current, "symbol")).toEqual({
        key: "symbol",
        direction: "asc",
      });
    });

    it("defaults to desc on new column", () => {
      expect(toggleJournalTradesTableSort(DEFAULT_JOURNAL_TRADES_TABLE_SORT, "symbol")).toEqual({
        key: "symbol",
        direction: "desc",
      });
    });

    it("returns null for non-sortable column", () => {
      expect(toggleJournalTradesTableSort(DEFAULT_JOURNAL_TRADES_TABLE_SORT, "tags")).toBeNull();
    });
  });

  describe("toggleJournalTradesTableColumn", () => {
    it("always keeps chart visible", () => {
      const defaults = defaultJournalTradesTablePrefs().visibleColumns;
      const next = toggleJournalTradesTableColumn(defaults, "chart");
      expect(next).toContain("chart");
    });

    it("hides and shows optional columns", () => {
      const defaults = defaultJournalTradesTablePrefs().visibleColumns;
      const hidden = toggleJournalTradesTableColumn(defaults, "symbol");
      expect(hidden).not.toContain("symbol");
      const shown = toggleJournalTradesTableColumn(hidden, "netPnL");
      expect(shown).toContain("netPnL");
    });
  });

  describe("prefs localStorage", () => {
    const storage = new Map<string, string>();

    beforeEach(() => {
      storage.clear();
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("round-trips prefs", () => {
      const prefs = {
        visibleColumns: ["symbol", "status", "chart"] as const,
        density: "comfortable" as const,
        pageSize: 25,
      };
      writeJournalTradesTablePrefs({
        visibleColumns: [...prefs.visibleColumns],
        density: prefs.density,
        pageSize: prefs.pageSize,
      });
      expect(readJournalTradesTablePrefs()).toEqual({
        visibleColumns: ["symbol", "status", "chart"],
        density: "comfortable",
        pageSize: 25,
      });
    });

    it("returns defaults when storage is empty", () => {
      expect(readJournalTradesTablePrefs()).toEqual(defaultJournalTradesTablePrefs());
    });
  });
});
