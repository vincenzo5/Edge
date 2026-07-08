import { describe, expect, it } from "vitest";

import {
  buildCalendarMonth,
  computeBreakdownReport,
  computeDailyPnL,
  computeDaySummaryStats,
  computeEquityCurve,
  computeIntradayPnLCurve,
  computeJournalStats,
  computeTimeBreakdownReport,
  filterJournalTrades,
  filterOpenJournalTrades,
  filterTradesClosedOnDate,
  hasCustomClosedDateRange,
  scopeClosedTradesForReporting,
  scopeTradesForTradesView,
  scopeTradesForReporting,
  type JournalReportTradeInput,
} from "@/lib/journal/journalStats";
import type { JournalTrade } from "@/lib/journal/types";

const closedTrade = (
  overrides: Partial<JournalReportTradeInput> & { id?: string; netPnL: number; closedAt: string },
): JournalReportTradeInput => ({
  id: overrides.id ?? `t-${overrides.netPnL}`,
  status: "closed",
  direction: overrides.netPnL >= 0 ? "long" : "short",
  symbol: overrides.symbol ?? "AAPL",
  secType: "STK",
  openedAt: overrides.openedAt ?? overrides.closedAt,
  closedAt: overrides.closedAt,
  netPnL: overrides.netPnL,
  tags: overrides.tags,
  setup: overrides.setup,
});

describe("journalStats", () => {
  it("computes win rate and net pnl", () => {
    const stats = computeJournalStats(
      [
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
        closedTrade({ netPnL: -50, closedAt: "2026-06-02T16:00:00.000Z" }),
      ],
      "all",
      Date.parse("2026-06-03T00:00:00.000Z"),
    );
    expect(stats.closedCount).toBe(2);
    expect(stats.winCount).toBe(1);
    expect(stats.lossCount).toBe(1);
    expect(stats.netPnL).toBe(50);
    expect(stats.winRate).toBe(0.5);
    expect(stats.totalProfit).toBe(100);
    expect(stats.totalLoss).toBe(-50);
    expect(stats.profitFactor).toBe(2);
  });

  describe("computeDailyPnL", () => {
    it("aggregates same-day trades and sorts desc", () => {
      const rows = computeDailyPnL([
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
        closedTrade({ netPnL: 50, closedAt: "2026-06-01T18:00:00.000Z" }),
        closedTrade({ netPnL: -20, closedAt: "2026-06-02T16:00:00.000Z" }),
      ]);
      expect(rows).toEqual([
        { date: "2026-06-02", netPnL: -20, tradeCount: 1 },
        { date: "2026-06-01", netPnL: 150, tradeCount: 2 },
      ]);
    });

    it("skips open trades", () => {
      const rows = computeDailyPnL([
        {
          status: "open",
          openedAt: "2026-06-01T16:00:00.000Z",
          netPnL: 100,
        },
      ]);
      expect(rows).toEqual([]);
    });
  });

  describe("filterJournalTrades", () => {
    const trades: JournalReportTradeInput[] = [
      closedTrade({
        id: "win",
        netPnL: 100,
        closedAt: "2026-06-01T16:00:00.000Z",
        symbol: "AAPL",
        setup: "breakout",
        tags: ["momentum", "planned"],
      }),
      closedTrade({
        id: "loss",
        netPnL: -40,
        closedAt: "2026-06-02T16:00:00.000Z",
        symbol: "MSFT",
        setup: "pullback",
        tags: ["fomo"],
      }),
      {
        status: "open",
        openedAt: "2026-06-03T16:00:00.000Z",
        symbol: "SPY",
        netPnL: null,
      },
    ];

    it("filters by status", () => {
      expect(filterJournalTrades(trades, { status: "closed" })).toHaveLength(2);
      expect(filterJournalTrades(trades, { status: "open" })).toHaveLength(1);
    });

    it("filters by symbol case-insensitively", () => {
      expect(filterJournalTrades(trades, { symbol: "aapl" })).toHaveLength(1);
    });

    it("filters by setup", () => {
      expect(filterJournalTrades(trades, { setup: "breakout" })).toHaveLength(1);
    });

    it("filters by tag", () => {
      expect(filterJournalTrades(trades, { tag: "fomo" })).toHaveLength(1);
    });

    it("filters by outcome win/loss", () => {
      expect(filterJournalTrades(trades, { outcome: "win" })).toHaveLength(1);
      expect(filterJournalTrades(trades, { outcome: "loss" })).toHaveLength(1);
    });

    it("filters by closed date range and single closedDate", () => {
      expect(
        filterJournalTrades(trades, {
          closedFrom: "2026-06-01",
          closedTo: "2026-06-01",
        }),
      ).toHaveLength(1);
      expect(filterJournalTrades(trades, { closedDate: "2026-06-02" })).toHaveLength(1);
    });

    it("combines filters with AND semantics", () => {
      expect(
        filterJournalTrades(trades, {
          status: "closed",
          setup: "breakout",
          outcome: "win",
        }),
      ).toHaveLength(1);
    });
  });

  describe("filterTradesClosedOnDate", () => {
    it("returns closed trades for a single calendar day", () => {
      const trades = [
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
        closedTrade({ netPnL: -50, closedAt: "2026-06-02T16:00:00.000Z" }),
        {
          status: "open" as const,
          openedAt: "2026-06-01T16:00:00.000Z",
          netPnL: null,
        },
      ];
      expect(filterTradesClosedOnDate(trades, "2026-06-01")).toHaveLength(1);
      expect(filterTradesClosedOnDate(trades, "2026-06-03")).toHaveLength(0);
    });
  });

  describe("computeIntradayPnLCurve", () => {
    it("returns cumulative P&L sorted by close time starting at zero", () => {
      const curve = computeIntradayPnLCurve([
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T18:00:00.000Z" }),
        closedTrade({ netPnL: -30, closedAt: "2026-06-01T10:00:00.000Z" }),
      ]);
      expect(curve).toEqual([
        { closedAt: "2026-06-01T10:00:00.000Z", tradePnL: 0, cumulativePnL: 0 },
        { closedAt: "2026-06-01T10:00:00.000Z", tradePnL: -30, cumulativePnL: -30 },
        { closedAt: "2026-06-01T18:00:00.000Z", tradePnL: 100, cumulativePnL: 70 },
      ]);
    });

    it("returns empty for no closed trades", () => {
      expect(computeIntradayPnLCurve([])).toEqual([]);
    });
  });

  describe("computeDaySummaryStats", () => {
    it("extends journal stats with commissions and volume", () => {
      const stats = computeDaySummaryStats([
        {
          ...closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
          totalCommission: 2.5,
          netQuantity: 10,
        },
        {
          ...closedTrade({ netPnL: -40, closedAt: "2026-06-01T18:00:00.000Z" }),
          totalCommission: 1.5,
          netQuantity: -5,
        },
      ]);
      expect(stats.closedCount).toBe(2);
      expect(stats.netPnL).toBe(60);
      expect(stats.totalCommissions).toBe(4);
      expect(stats.volume).toBe(15);
    });
  });

  describe("computeEquityCurve", () => {
    it("returns daily cumulative P&L sorted by date asc", () => {
      const curve = computeEquityCurve([
        closedTrade({ netPnL: 100, closedAt: "2026-06-02T16:00:00.000Z" }),
        closedTrade({ netPnL: -30, closedAt: "2026-06-01T16:00:00.000Z" }),
      ]);
      expect(curve).toEqual([
        { date: "2026-06-01", tradePnL: -30, cumulativePnL: -30 },
        { date: "2026-06-02", tradePnL: 100, cumulativePnL: 70 },
      ]);
    });

    it("aggregates same-day trades into one point", () => {
      const curve = computeEquityCurve([
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T10:00:00.000Z" }),
        closedTrade({ netPnL: 50, closedAt: "2026-06-01T18:00:00.000Z" }),
        closedTrade({ netPnL: -20, closedAt: "2026-06-02T16:00:00.000Z" }),
      ]);
      expect(curve).toEqual([
        { date: "2026-06-01", tradePnL: 150, cumulativePnL: 150 },
        { date: "2026-06-02", tradePnL: -20, cumulativePnL: 130 },
      ]);
    });

    it("returns empty for no closed trades", () => {
      expect(computeEquityCurve([])).toEqual([]);
    });
  });

  describe("computeBreakdownReport", () => {
    it("groups by setup including no setup bucket", () => {
      const rows = computeBreakdownReport(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z", setup: "breakout" }),
          closedTrade({ netPnL: -50, closedAt: "2026-06-02T16:00:00.000Z", setup: null }),
        ],
        "setup",
      );
      expect(rows.map((row) => row.bucket)).toEqual(expect.arrayContaining(["breakout", "(no setup)"]));
    });

    it("groups by tag with multi-tag double count and untagged bucket", () => {
      const rows = computeBreakdownReport(
        [
          closedTrade({
            netPnL: 80,
            closedAt: "2026-06-01T16:00:00.000Z",
            tags: ["a", "b"],
          }),
          closedTrade({ netPnL: -20, closedAt: "2026-06-02T16:00:00.000Z", tags: [] }),
        ],
        "tag",
      );
      const byBucket = Object.fromEntries(rows.map((row) => [row.bucket, row.tradeCount]));
      expect(byBucket.a).toBe(1);
      expect(byBucket.b).toBe(1);
      expect(byBucket["(untagged)"]).toBe(1);
    });
  });

  describe("computeTimeBreakdownReport", () => {
    it("buckets closed trades by ET hour", () => {
      const rows = computeTimeBreakdownReport(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-02T14:30:00.000Z" }),
          closedTrade({ netPnL: -50, closedAt: "2026-06-02T15:00:00.000Z" }),
        ],
        "hour",
      );
      const byBucket = Object.fromEntries(rows.map((row) => [row.bucket, row.tradeCount]));
      expect(byBucket["10:00"]).toBe(1);
      expect(byBucket["11:00"]).toBe(1);
    });

    it("buckets closed trades by ET weekday", () => {
      const rows = computeTimeBreakdownReport(
        [closedTrade({ netPnL: 80, closedAt: "2026-06-02T14:30:00.000Z" })],
        "weekday",
      );
      expect(rows[0]?.bucket).toBe("Tue");
      expect(rows[0]?.tradeCount).toBe(1);
    });

    it("returns empty for no closed trades", () => {
      expect(computeTimeBreakdownReport([], "hour")).toEqual([]);
    });
  });

  describe("buildCalendarMonth", () => {
    it("pads month grid and maps daily rows", () => {
      const month = buildCalendarMonth(2026, 5, [
        { date: "2026-06-01", netPnL: 100, tradeCount: 2 },
        { date: "2026-06-15", netPnL: -50, tradeCount: 1 },
      ]);
      expect(month.year).toBe(2026);
      expect(month.month).toBe(5);
      expect(month.cells[0].inMonth).toBe(false);
      const june1 = month.cells.find((cell) => cell.date === "2026-06-01");
      expect(june1?.netPnL).toBe(100);
      expect(june1?.tradeCount).toBe(2);
      expect(month.cells.filter((cell) => cell.inMonth)).toHaveLength(30);
    });
  });

  describe("scopeTradesForReporting", () => {
    it("applies filters then window on closed trades", () => {
      const scoped = scopeTradesForReporting(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z", setup: "breakout" }),
          closedTrade({ netPnL: 50, closedAt: "2026-05-01T16:00:00.000Z", setup: "breakout" }),
        ],
        { setup: "breakout" },
        "30d",
        Date.parse("2026-06-10T00:00:00.000Z"),
      );
      expect(scoped).toHaveLength(1);
      expect(scoped[0].netPnL).toBe(100);
    });
  });

  describe("scopeClosedTradesForReporting", () => {
    it("includes trades in custom range even when outside preset window", () => {
      const scoped = scopeClosedTradesForReporting(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-05-01T16:00:00.000Z" }),
          closedTrade({ netPnL: 50, closedAt: "2026-06-01T16:00:00.000Z" }),
        ],
        { closedFrom: "2026-05-01", closedTo: "2026-05-31" },
        "7d",
        Date.parse("2026-06-10T00:00:00.000Z"),
      );
      expect(scoped).toHaveLength(1);
      expect(scoped[0].netPnL).toBe(100);
    });

    it("applies symbol filter with custom dates", () => {
      const scoped = scopeClosedTradesForReporting(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z", symbol: "AAPL" }),
          closedTrade({ netPnL: 50, closedAt: "2026-06-02T16:00:00.000Z", symbol: "MSFT" }),
        ],
        { symbol: "AAPL", closedFrom: "2026-06-01", closedTo: "2026-06-30" },
        "all",
      );
      expect(scoped).toHaveLength(1);
      expect(scoped[0].symbol).toBe("AAPL");
    });

    it("excludes open trades from closed scope", () => {
      const scoped = scopeClosedTradesForReporting(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
          {
            ...closedTrade({ netPnL: 0, closedAt: "2026-06-02T16:00:00.000Z" }),
            status: "open",
            closedAt: null,
          },
        ],
        {},
        "30d",
        Date.parse("2026-06-10T00:00:00.000Z"),
      );
      expect(scoped).toHaveLength(1);
      expect(scoped[0].netPnL).toBe(100);
    });
  });

  describe("filterOpenJournalTrades", () => {
    it("returns open trades matching filters without period gate", () => {
      const open = filterOpenJournalTrades(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z", symbol: "AAPL" }),
          {
            ...closedTrade({ netPnL: 0, closedAt: "2026-06-02T16:00:00.000Z" }),
            status: "open",
            closedAt: null,
            symbol: "AAPL",
            openedAt: "2026-01-01T16:00:00.000Z",
          },
        ],
        { symbol: "AAPL" },
      );
      expect(open).toHaveLength(1);
      expect(open[0].status).toBe("open");
    });
  });

  describe("scopeTradesForTradesView", () => {
    it("returns open trades without period gate when status is open", () => {
      const trades = scopeTradesForTradesView(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-05-01T16:00:00.000Z" }),
          {
            ...closedTrade({ netPnL: 0, closedAt: "2026-06-02T16:00:00.000Z" }),
            status: "open",
            closedAt: null,
            openedAt: "2026-01-01T16:00:00.000Z",
          },
        ],
        { status: "open" },
        "7d",
        Date.parse("2026-06-10T00:00:00.000Z"),
      );
      expect(trades).toHaveLength(1);
      expect(trades[0].status).toBe("open");
    });

    it("merges open and period-scoped closed trades when status is all", () => {
      const trades = scopeTradesForTradesView(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
          closedTrade({ netPnL: 50, closedAt: "2026-05-01T16:00:00.000Z" }),
          {
            ...closedTrade({ netPnL: 0, closedAt: "2026-06-02T16:00:00.000Z" }),
            status: "open",
            closedAt: null,
            openedAt: "2026-01-01T16:00:00.000Z",
          },
        ],
        { status: "all" },
        "30d",
        Date.parse("2026-06-10T00:00:00.000Z"),
      );
      expect(trades).toHaveLength(2);
      expect(trades.some((trade) => trade.status === "open")).toBe(true);
      expect(trades.some((trade) => trade.netPnL === 100)).toBe(true);
    });
  });

  describe("hasCustomClosedDateRange", () => {
    it("returns true when either bound is set", () => {
      expect(hasCustomClosedDateRange({ closedFrom: "2026-06-01" })).toBe(true);
      expect(hasCustomClosedDateRange({ closedTo: "2026-06-30" })).toBe(true);
      expect(hasCustomClosedDateRange({})).toBe(false);
    });
  });
});
