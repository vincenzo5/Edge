import { describe, it, expect } from "vitest";
import { groupFromScreenQuery } from "./compileQuery";
import { createDefaultScreenerSession } from "./screenerSession";
import { DEFAULT_SCREENER_STATE } from "./screenStorage";
import type { ScreenerResultRow } from "./types";
import {
  REVIEW_KEEPERS_WATCHLIST_NAME,
  advanceReview,
  clearReviewSession,
  getReviewSymbol,
  jumpToSymbol,
  keepCurrent,
  reviewProgress,
  skipCurrent,
  startReview,
} from "./reviewSession";
import {
  addSymbolToKeepersWatchlist,
  ensureKeepersWatchlist,
} from "./reviewKeepers";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";

function makeRow(symbol: string, name: string | null = `${symbol} Inc.`): ScreenerResultRow {
  return {
    symbol,
    name,
    price: 100,
    change: 1,
    changePercent: 1,
    exchange: "NASDAQ",
    volume: 1_000_000,
    sector: "Technology",
    industry: "Software",
    country: "US",
    beta: 1.1,
    marketCap: 1_000_000_000,
    dividendYield: null,
  };
}

const ROWS = [makeRow("AAPL"), makeRow("MSFT"), makeRow("GOOG")];

function baseSession() {
  return createDefaultScreenerSession(DEFAULT_SCREENER_STATE);
}

describe("reviewSession", () => {
  describe("REVIEW_KEEPERS_WATCHLIST_NAME", () => {
    it("is Keepers", () => {
      expect(REVIEW_KEEPERS_WATCHLIST_NAME).toBe("Keepers");
    });
  });

  describe("reviewProgress", () => {
    it("returns 1-based current with label", () => {
      expect(reviewProgress(0, 3)).toEqual({
        current: 1,
        total: 3,
        label: "1 / 3",
      });
      expect(reviewProgress(2, 3)).toEqual({
        current: 3,
        total: 3,
        label: "3 / 3",
      });
    });

    it("handles empty totals", () => {
      expect(reviewProgress(0, 0)).toEqual({
        current: 0,
        total: 0,
        label: "0 / 0",
      });
    });

    it("clamps current when index exceeds total", () => {
      expect(reviewProgress(5, 3)).toEqual({
        current: 3,
        total: 3,
        label: "3 / 3",
      });
    });
  });

  describe("getReviewSymbol", () => {
    it("returns row at index", () => {
      expect(getReviewSymbol(ROWS, 0)?.symbol).toBe("AAPL");
      expect(getReviewSymbol(ROWS, 2)?.symbol).toBe("GOOG");
    });

    it("returns null for out-of-range indices", () => {
      expect(getReviewSymbol(ROWS, -1)).toBeNull();
      expect(getReviewSymbol(ROWS, 3)).toBeNull();
      expect(getReviewSymbol([], 0)).toBeNull();
    });
  });

  describe("advanceReview", () => {
    it("moves forward and backward with clamping", () => {
      let session = { ...baseSession(), reviewIndex: 0 };
      session = advanceReview(session, ROWS, 1);
      expect(session.reviewIndex).toBe(1);

      session = advanceReview(session, ROWS, 1);
      expect(session.reviewIndex).toBe(2);

      session = advanceReview(session, ROWS, 1);
      expect(session.reviewIndex).toBe(2);

      session = advanceReview(session, ROWS, -1);
      expect(session.reviewIndex).toBe(1);
    });

    it("clamps at zero", () => {
      const session = advanceReview({ ...baseSession(), reviewIndex: 0 }, ROWS, -1);
      expect(session.reviewIndex).toBe(0);
    });

    it("keeps index at zero for empty rows", () => {
      const session = advanceReview({ ...baseSession(), reviewIndex: 0 }, [], 1);
      expect(session.reviewIndex).toBe(0);
    });
  });

  describe("keepCurrent", () => {
    it("adds symbol to keepers and advances without skipping", () => {
      const session = keepCurrent({ ...baseSession(), reviewIndex: 0 }, ROWS);
      expect(session.keepers).toEqual(["AAPL"]);
      expect(session.skipped).toEqual([]);
      expect(session.reviewIndex).toBe(1);
    });

    it("does not duplicate keepers", () => {
      const session = keepCurrent(
        { ...baseSession(), reviewIndex: 0, keepers: ["AAPL"] },
        ROWS,
      );
      expect(session.keepers).toEqual(["AAPL"]);
      expect(session.reviewIndex).toBe(1);
    });

    it("normalizes symbol casing", () => {
      const rows = [makeRow("aapl")];
      const session = keepCurrent({ ...baseSession(), reviewIndex: 0 }, rows);
      expect(session.keepers).toEqual(["AAPL"]);
    });

    it("is a no-op when index is out of range", () => {
      const before = { ...baseSession(), reviewIndex: 99, keepers: ["X"] };
      const session = keepCurrent(before, ROWS);
      expect(session).toEqual(before);
    });
  });

  describe("skipCurrent", () => {
    it("adds symbol to skipped and advances", () => {
      const session = skipCurrent({ ...baseSession(), reviewIndex: 1 }, ROWS);
      expect(session.skipped).toEqual(["MSFT"]);
      expect(session.keepers).toEqual([]);
      expect(session.reviewIndex).toBe(2);
    });

    it("does not duplicate skipped symbols", () => {
      const session = skipCurrent(
        { ...baseSession(), reviewIndex: 0, skipped: ["AAPL"] },
        ROWS,
      );
      expect(session.skipped).toEqual(["AAPL"]);
      expect(session.reviewIndex).toBe(1);
    });

    it("is a no-op when index is out of range", () => {
      const before = { ...baseSession(), reviewIndex: 5, skipped: ["X"] };
      const session = skipCurrent(before, ROWS);
      expect(session).toEqual(before);
    });
  });

  describe("jumpToSymbol", () => {
    it("sets reviewIndex to matching symbol", () => {
      const session = jumpToSymbol({ ...baseSession(), reviewIndex: 0 }, ROWS, "GOOG");
      expect(session.reviewIndex).toBe(2);
    });

    it("matches case-insensitively", () => {
      const session = jumpToSymbol({ ...baseSession(), reviewIndex: 0 }, ROWS, "msft");
      expect(session.reviewIndex).toBe(1);
    });

    it("returns unchanged session when symbol is missing", () => {
      const before = { ...baseSession(), reviewIndex: 1 };
      const session = jumpToSymbol(before, ROWS, "TSLA");
      expect(session).toEqual(before);
    });
  });

  describe("startReview", () => {
    it("activates review at index zero", () => {
      const session = startReview({
        ...baseSession(),
        reviewActive: false,
        reviewIndex: 2,
      });
      expect(session.reviewActive).toBe(true);
      expect(session.reviewIndex).toBe(0);
    });
  });

  describe("clearReviewSession", () => {
    it("resets review fields", () => {
      const session = clearReviewSession({
        ...baseSession(),
        reviewActive: true,
        reviewIndex: 2,
        keepers: ["AAPL"],
        skipped: ["MSFT"],
      });
      expect(session.reviewActive).toBe(false);
      expect(session.reviewIndex).toBe(0);
      expect(session.keepers).toEqual([]);
      expect(session.skipped).toEqual([]);
    });
  });

  describe("createDefaultScreenerSession", () => {
    it("includes review defaults", () => {
      const session = createDefaultScreenerSession(DEFAULT_SCREENER_STATE);
      expect(session.reviewIndex).toBe(0);
      expect(session.keepers).toEqual([]);
      expect(session.skipped).toEqual([]);
      expect(session.reviewActive).toBe(false);
    });
  });
});

describe("reviewKeepers", () => {
  it("creates Keepers watchlist when missing", () => {
    const { state, watchlistId } = ensureKeepersWatchlist(DEFAULT_WATCHLIST_STATE);
    const keepers = state.watchlists.find((list) => list.id === watchlistId);
    expect(keepers?.name).toBe(REVIEW_KEEPERS_WATCHLIST_NAME);
    expect(keepers?.items).toEqual([]);
  });

  it("reuses existing Keepers watchlist", () => {
    const first = ensureKeepersWatchlist(DEFAULT_WATCHLIST_STATE);
    const second = ensureKeepersWatchlist(first.state);
    expect(second.watchlistId).toBe(first.watchlistId);
    expect(second.state.watchlists.filter((list) => list.name === "Keepers")).toHaveLength(1);
  });

  it("adds symbol to Keepers without changing active watchlist", () => {
    const activeId = DEFAULT_WATCHLIST_STATE.activeWatchlistId;
    const next = addSymbolToKeepersWatchlist(DEFAULT_WATCHLIST_STATE, "NVDA", "NVIDIA");
    const keepers = next.watchlists.find((list) => list.name === "Keepers");

    expect(next.activeWatchlistId).toBe(activeId);
    expect(keepers?.items.map((item) => item.symbol)).toEqual(["NVDA"]);
    expect(keepers?.items[0]?.name).toBe("NVIDIA");
  });

  it("dedupes symbols in Keepers watchlist", () => {
    let state = addSymbolToKeepersWatchlist(DEFAULT_WATCHLIST_STATE, "AAPL");
    state = addSymbolToKeepersWatchlist(state, "aapl");
    const keepers = state.watchlists.find((list) => list.name === "Keepers");
    expect(keepers?.items).toHaveLength(1);
  });
});
