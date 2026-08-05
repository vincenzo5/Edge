import { describe, expect, it } from "vitest";

import {
  buildCalendarMonth,
  calendarHeatIntensity,
  calendarMaxAbsPnL,
  applyCompareSlice,
  buildComparePresetSlices,
  computeCalendarMonthSummary,
  computeCalendarWeekTotals,
  computeBreakdownReport,
  computeCompareReport,
  computeDailyPnL,
  computeDaySummaryStats,
  computeEquityCurve,
  computeIntradayPnLCurve,
  computeJournalDashboardMetrics,
  computeJournalDrawdown,
  computeJournalEquityChangePct,
  resolveJournalStartingEquity,
  scaleJournalMetricByStartingEquity,
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
  rating: overrides.rating,
  ignored: overrides.ignored,
  plannedRiskMode: overrides.plannedRiskMode,
  plannedRiskValue: overrides.plannedRiskValue,
  plannedRiskUsd: overrides.plannedRiskUsd,
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
        { date: "2026-06-02", netPnL: -20, tradeCount: 1, winCount: 0, lossCount: 1 },
        { date: "2026-06-01", netPnL: 150, tradeCount: 2, winCount: 2, lossCount: 0 },
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

    it("filters by rating", () => {
      const ratedTrades: JournalReportTradeInput[] = [
        { ...closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }), rating: 5 },
        { ...closedTrade({ netPnL: -50, closedAt: "2026-06-02T16:00:00.000Z" }), rating: 2 },
        { ...closedTrade({ netPnL: 10, closedAt: "2026-06-03T16:00:00.000Z" }), rating: null },
      ];
      expect(filterJournalTrades(ratedTrades, { rating: 5 })).toHaveLength(1);
      expect(filterJournalTrades(ratedTrades, { rating: "unrated" })).toHaveLength(1);
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

  describe("journal dashboard metrics helpers", () => {
    it("resolves starting equity from live account and scoped net P&L", () => {
      expect(resolveJournalStartingEquity(125_430, 420)).toBe(125_010);
      expect(resolveJournalStartingEquity(null, 420)).toBeNull();
      expect(resolveJournalStartingEquity(100, 200)).toBeNull();
    });

    it("computes equity change percent from starting equity", () => {
      expect(computeJournalEquityChangePct(125_010, 420)).toBeCloseTo(420 / 125_010);
      expect(computeJournalEquityChangePct(null, 420)).toBeNull();
    });

    it("computes max drawdown from equity curve and starting equity", () => {
      const curve = computeEquityCurve([
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
        closedTrade({ netPnL: -180, closedAt: "2026-06-02T16:00:00.000Z" }),
        closedTrade({ netPnL: 50, closedAt: "2026-06-03T16:00:00.000Z" }),
      ]);
      const drawdown = computeJournalDrawdown(curve, 10_000);
      expect(drawdown.maxDdUsd).toBe(180);
      expect(drawdown.maxDdPct).toBeCloseTo(180 / 10_000);
      expect(drawdown.currentDdUsd).toBe(130);
    });

    it("scales dollar metrics by starting equity for percent mode", () => {
      expect(scaleJournalMetricByStartingEquity(45, 10_000)).toBeCloseTo(0.0045);
      expect(scaleJournalMetricByStartingEquity(45, null)).toBeNull();
    });

    it("bundles dashboard metrics from scoped trades and account equity", () => {
      const trades = [
        closedTrade({
          netPnL: 100,
          closedAt: "2026-06-01T16:00:00.000Z",
          plannedRiskUsd: 100,
        }),
        closedTrade({
          netPnL: -50,
          closedAt: "2026-06-02T16:00:00.000Z",
          plannedRiskUsd: 100,
        }),
      ];
      const metrics = computeJournalDashboardMetrics(trades, 10_050);
      expect(metrics.startingEquity).toBe(10_000);
      expect(metrics.equityChangePct).toBeCloseTo(50 / 10_000);
      expect(metrics.drawdown.maxDdUsd).toBe(50);
      expect(metrics.rStats.netR).toBe(0.5);
      expect(metrics.rStats.expectancyR).toBe(0.25);
      expect(metrics.rStats.tradeCountWithR).toBe(2);
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

    it("groups by rating with unrated bucket", () => {
      const rows = computeBreakdownReport(
        [
          closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z", rating: 5 }),
          closedTrade({ netPnL: -20, closedAt: "2026-06-02T16:00:00.000Z", rating: null }),
        ],
        "rating",
      );
      expect(rows.map((row) => row.bucket)).toEqual(["5", "(unrated)"]);
    });
  });

  describe("computeCompareReport", () => {
    it("compares wins vs losses slices", () => {
      const trades: JournalReportTradeInput[] = [
        closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
        closedTrade({ netPnL: -50, closedAt: "2026-06-02T16:00:00.000Z" }),
      ];
      const { sliceA, sliceB } = buildComparePresetSlices("wins_vs_losses");
      const report = computeCompareReport(trades, sliceA, sliceB, {
        a: "Wins",
        b: "Losses",
      });
      expect(report.sliceA.tradeCount).toBe(1);
      expect(report.sliceB.tradeCount).toBe(1);
      expect(report.sliceA.stats.netPnL).toBe(100);
      expect(report.sliceB.stats.netPnL).toBe(-50);
    });

    it("filters rating min/max in applyCompareSlice", () => {
      const trades: JournalReportTradeInput[] = [
        { ...closedTrade({ netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }), rating: 5 },
        { ...closedTrade({ netPnL: -20, closedAt: "2026-06-02T16:00:00.000Z" }), rating: 2 },
        { ...closedTrade({ netPnL: 10, closedAt: "2026-06-03T16:00:00.000Z" }), rating: null },
      ];
      expect(applyCompareSlice(trades, { ratingMin: 4 })).toHaveLength(1);
      expect(applyCompareSlice(trades, { ratingMax: 2 })).toHaveLength(1);
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
    it("builds Mon-Fri weekday grid with week rows", () => {
      const month = buildCalendarMonth(2026, 5, [
        { date: "2026-06-01", netPnL: 100, tradeCount: 2, winCount: 2, lossCount: 0 },
        { date: "2026-06-15", netPnL: -50, tradeCount: 1, winCount: 0, lossCount: 1 },
      ]);
      expect(month.year).toBe(2026);
      expect(month.month).toBe(5);
      expect(month.cells.length % 5).toBe(0);
      const june1 = month.cells.find((cell) => cell.date === "2026-06-01");
      expect(june1?.netPnL).toBe(100);
      expect(june1?.tradeCount).toBe(2);
      expect(june1?.inMonth).toBe(true);
      expect(month.cells.some((cell) => cell.date === "2026-06-06")).toBe(false);
      expect(month.cells.some((cell) => cell.date === "2026-06-07")).toBe(false);
      expect(month.cells.filter((cell) => cell.inMonth)).toHaveLength(22);
    });
  });

  describe("calendar helpers", () => {
    const cells = buildCalendarMonth(2026, 5, [
      { date: "2026-06-01", netPnL: 100, tradeCount: 1, winCount: 1, lossCount: 0 },
      { date: "2026-06-02", netPnL: -40, tradeCount: 1, winCount: 0, lossCount: 1 },
      { date: "2026-06-03", netPnL: 200, tradeCount: 1, winCount: 1, lossCount: 0 },
    ]).cells;

    it("computes month summary including weekend-only days", () => {
      const summary = computeCalendarMonthSummary(
        [
          { date: "2026-06-01", netPnL: 100, tradeCount: 1, winCount: 1, lossCount: 0 },
          { date: "2026-06-06", netPnL: 50, tradeCount: 1, winCount: 1, lossCount: 0 },
        ],
        2026,
        5,
      );
      expect(summary.netPnL).toBe(150);
      expect(summary.winDays).toBe(2);
      expect(summary.tradeCount).toBe(2);
    });

    it("computes week totals per Mon-Fri row", () => {
      const totals = computeCalendarWeekTotals(cells);
      expect(totals[0]).toBe(260);
    });

    it("week totals exclude out-of-month days on crossover weeks", () => {
      // July 2026 starts Wednesday — first week includes Mon–Tue from June.
      const julyCells = buildCalendarMonth(2026, 6, [
        { date: "2026-06-29", netPnL: 500, tradeCount: 1, winCount: 1, lossCount: 0 },
        { date: "2026-06-30", netPnL: 300, tradeCount: 1, winCount: 1, lossCount: 0 },
        { date: "2026-07-01", netPnL: 100, tradeCount: 1, winCount: 1, lossCount: 0 },
        { date: "2026-07-02", netPnL: -40, tradeCount: 1, winCount: 0, lossCount: 1 },
        { date: "2026-07-03", netPnL: 20, tradeCount: 1, winCount: 1, lossCount: 0 },
      ]).cells;
      const june29 = julyCells.find((cell) => cell.date === "2026-06-29");
      const july1 = julyCells.find((cell) => cell.date === "2026-07-01");
      expect(june29?.inMonth).toBe(false);
      expect(july1?.inMonth).toBe(true);
      const totals = computeCalendarWeekTotals(julyCells);
      expect(totals[0]).toBe(80);
    });

    it("scales heat intensity by month max abs P&L", () => {
      const maxAbs = calendarMaxAbsPnL(cells);
      expect(maxAbs).toBe(200);
      expect(calendarHeatIntensity(200, maxAbs)).toBe(1);
      expect(calendarHeatIntensity(100, maxAbs)).toBe(0.5);
      expect(calendarHeatIntensity(0, maxAbs)).toBe(0);
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

  describe("ignored trades", () => {
    const trades = [
      closedTrade({ id: "included", netPnL: 100, closedAt: "2026-06-01T16:00:00.000Z" }),
      closedTrade({
        id: "ignored",
        symbol: "BBD",
        netPnL: -25,
        closedAt: "2026-06-02T16:00:00.000Z",
        ignored: true,
      }),
    ];

    it("excludes ignored trades from scoped reporting by default", () => {
      const scoped = scopeClosedTradesForReporting(trades, {}, "all");
      expect(scoped.map((trade) => trade.id)).toEqual(["included"]);
      expect(computeJournalStats(scoped, "all").netPnL).toBe(100);
    });

    it("includes ignored trades when includeIgnored is true", () => {
      const scoped = scopeTradesForTradesView(trades, { includeIgnored: true }, "all");
      expect(scoped.map((trade) => trade.id).sort()).toEqual(["ignored", "included"]);
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
