import { describe, expect, it, vi } from "vitest";
import type { JournalPort } from "../journalPort";
import type { ToolContext } from "../context";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import type { ChartLayout } from "@/lib/chartConfig";
import {
  compareJournalSlicesTool,
  getJournalBreakdownTool,
  getJournalDailyPnLTool,
  getJournalEquityCurveTool,
  getJournalStatsTool,
  getJournalTimeReportTool,
  getJournalTradeTool,
  listJournalTradesTool,
  openJournalTradeOnChartTool,
  updateJournalTradeReviewTool,
} from "./journal";

const tradeId = "11111111-1111-4111-8111-111111111111";
const lossTradeId = "22222222-2222-4222-8222-222222222222";

const sampleTrade: JournalTradeResponse = {
  id: tradeId,
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-07-01T14:30:00.000Z",
  closedAt: "2026-07-01T15:00:00.000Z",
  netQuantity: 0,
  avgEntry: 200,
  avgExit: 205,
  grossPnL: 5,
  netPnL: 4.5,
  totalCommission: 0.5,
  fillExecIds: ["exec-1", "exec-2"],
  tags: ["momentum"],
  setup: "breakout",
  reviewNote: "Clean open drive",
  plannedRiskMode: "usd",
  plannedRiskValue: 100,
  plannedRiskUsd: 100,
  rating: 4,
  mfeUsd: 6,
  mfaUsd: 1,
  excursionInterval: "5m",
  excursionComputedAt: "2026-07-01T16:00:00.000Z",
  createdAt: "2026-07-01T14:30:00.000Z",
  updatedAt: "2026-07-01T16:00:00.000Z",
};

const lossTrade: JournalTradeResponse = {
  ...sampleTrade,
  id: lossTradeId,
  symbol: "MSFT",
  netPnL: -2,
  grossPnL: -1.5,
  tags: ["fade"],
  setup: "reversal",
  rating: 2,
  openedAt: "2026-07-02T15:00:00.000Z",
  closedAt: "2026-07-02T16:00:00.000Z",
};

function mockJournalPort(overrides: Partial<JournalPort> = {}): JournalPort {
  return {
    listTrades: vi.fn().mockResolvedValue([sampleTrade]),
    getTrade: vi.fn().mockResolvedValue(sampleTrade),
    patchTrade: vi.fn().mockResolvedValue({
      ...sampleTrade,
      reviewNote: "Updated note",
    }),
    ...overrides,
  };
}

function baseMarketData(): ToolContext["marketData"] {
  return {
    searchSymbols: async () => [],
    getCandles: async () => ({ data: [], meta: { source: "test" } }),
    getQuotes: async () => ({ data: [], meta: { source: "test" } }),
    getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
    getOptionExpirations: async () => [],
    getOptionsChain: async () => ({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [],
    }),
  };
}

function mockContext(journal: JournalPort | null): ToolContext {
  return {
    clientSession: true,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary: null,
    marketData: baseMarketData(),
    trading: null,
    journal,
    alerts: null,
    research: null,
  };
}

function createLayout(overrides: Partial<ChartLayout> = {}): ChartLayout {
  return {
    version: 1,
    layoutId: "n1",
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: false,
    linkDrawings: false,
    theme: "dark",
    activeCellIndex: 0,
    cells: [
      {
        symbol: "SPY",
        range: "1y",
        interval: "1d",
        chartType: "candle_solid",
        indicators: [],
        drawings: [],
      },
    ],
    toolbarPrefs: {},
    sidebar: { activePanel: "object-tree" },
    ...overrides,
  };
}

function mockChartContext(
  journal: JournalPort,
  layout: ChartLayout,
): {
  context: ToolContext;
  loadSymbolIntoActiveChart: ReturnType<typeof vi.fn>;
  applyCellUpdate: ReturnType<typeof vi.fn>;
  setActiveCellIndex: ReturnType<typeof vi.fn>;
  goTo: ReturnType<typeof vi.fn>;
} {
  const loadSymbolIntoActiveChart = vi.fn();
  const applyCellUpdate = vi.fn((index: number, next: ChartLayout["cells"][number]) => {
    layout.cells[index] = next;
  });
  const setActiveCellIndex = vi.fn((index: number) => {
    layout.activeCellIndex = index;
  });
  const goTo = vi.fn().mockResolvedValue({ ok: true, at: Date.parse(sampleTrade.openedAt) });

  const context: ToolContext = {
    clientSession: true,
    app: {
      getLayout: () => layout,
      isHydrated: () => true,
      applyCellUpdate,
      patchActiveCell: () => {},
      setActiveCellIndex,
      setLayoutId: () => {},
      setGridMode: () => {},
      setLayoutSync: () => {},
      setTheme: () => {},
      setSidebarPanel: () => {},
    },
    chart: {
      getActiveChart: () =>
        ({
          overlays: [],
          dataWindow: { kind: "candle" },
          chartCommands: { goTo, getCandles: () => [] },
        }) as never,
      loadSymbolIntoActiveChart,
    },
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary: null,
    marketData: baseMarketData(),
    trading: null,
    journal,
    alerts: null,
    research: null,
  };

  return { context, loadSymbolIntoActiveChart, applyCellUpdate, setActiveCellIndex, goTo };
}

describe("journal AI tools", () => {
  it("list_journal_trades returns compact summaries", async () => {
    const journal = mockJournalPort();
    const result = await listJournalTradesTool.execute({ status: "closed" }, mockContext(journal));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.count).toBe(1);
    expect(result.data.trades[0]).toMatchObject({
      id: tradeId,
      symbol: "AAPL",
      status: "closed",
      netPnL: 4.5,
      setup: "breakout",
      rating: 4,
    });
    expect(journal.listTrades).toHaveBeenCalledWith({ status: "closed" });
  });

  it("get_journal_trade returns full trade", async () => {
    const journal = mockJournalPort({
      getTrade: vi.fn().mockResolvedValue(null),
    });
    const missing = await getJournalTradeTool.execute({ tradeId }, mockContext(journal));
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("not_found");

    const journalHit = mockJournalPort();
    const found = await getJournalTradeTool.execute({ tradeId }, mockContext(journalHit));
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.data.trade.reviewNote).toBe("Clean open drive");
  });

  it("get_journal_stats computes closed-trade stats", async () => {
    const journal = mockJournalPort();
    const result = await getJournalStatsTool.execute(
      { window: "all", status: "closed" },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stats.closedCount).toBe(1);
    expect(result.data.stats.winCount).toBe(1);
    expect(result.data.stats.netPnL).toBe(4.5);
  });

  it("update_journal_trade_review patches review fields", async () => {
    const journal = mockJournalPort();
    const result = await updateJournalTradeReviewTool.execute(
      { tradeId, reviewNote: "Updated note", rating: 5 },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(journal.patchTrade).toHaveBeenCalledWith(tradeId, {
      reviewNote: "Updated note",
      rating: 5,
    });
    expect(result.data.trade.reviewNote).toBe("Updated note");
  });

  it("throws when journal port is unavailable", async () => {
    await expect(
      listJournalTradesTool.execute({}, mockContext(null)),
    ).rejects.toThrow("Journal port unavailable");
  });

  it("get_journal_breakdown groups by setup", async () => {
    const journal = mockJournalPort({
      listTrades: vi.fn().mockResolvedValue([sampleTrade, lossTrade]),
    });
    const result = await getJournalBreakdownTool.execute(
      { window: "all", dimension: "setup" },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.dimension).toBe("setup");
    expect(result.data.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bucket: "breakout", tradeCount: 1, netPnL: 4.5 }),
        expect.objectContaining({ bucket: "reversal", tradeCount: 1, netPnL: -2 }),
      ]),
    );
  });

  it("get_journal_time_report buckets by weekday", async () => {
    const journal = mockJournalPort();
    const result = await getJournalTimeReportTool.execute(
      { window: "all", dimension: "weekday" },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.timeZone).toBe("America/New_York");
    expect(result.data.rows.length).toBeGreaterThan(0);
    expect(result.data.rows[0]).toMatchObject({
      tradeCount: 1,
      netPnL: 4.5,
    });
  });

  it("get_journal_equity_curve returns cumulative points", async () => {
    const journal = mockJournalPort({
      listTrades: vi.fn().mockResolvedValue([sampleTrade, lossTrade]),
    });
    const result = await getJournalEquityCurveTool.execute(
      { window: "all" },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.points).toEqual([
      { date: "2026-07-01", tradePnL: 4.5, cumulativePnL: 4.5 },
      { date: "2026-07-02", tradePnL: -2, cumulativePnL: 2.5 },
    ]);
  });

  it("get_journal_daily_pnl returns daily rows", async () => {
    const journal = mockJournalPort({
      listTrades: vi.fn().mockResolvedValue([sampleTrade, lossTrade]),
    });
    const result = await getJournalDailyPnLTool.execute({ window: "all" }, mockContext(journal));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows).toEqual([
      {
        date: "2026-07-02",
        netPnL: -2,
        tradeCount: 1,
        winCount: 0,
        lossCount: 1,
      },
      {
        date: "2026-07-01",
        netPnL: 4.5,
        tradeCount: 1,
        winCount: 1,
        lossCount: 0,
      },
    ]);
  });

  it("compare_journal_slices uses wins_vs_losses preset", async () => {
    const journal = mockJournalPort({
      listTrades: vi.fn().mockResolvedValue([sampleTrade, lossTrade]),
    });
    const result = await compareJournalSlicesTool.execute(
      { window: "all", preset: "wins_vs_losses" },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.preset).toBe("wins_vs_losses");
    expect(result.data.report.sliceA).toMatchObject({
      label: "Wins",
      tradeCount: 1,
    });
    expect(result.data.report.sliceB).toMatchObject({
      label: "Losses",
      tradeCount: 1,
    });
  });

  it("compare_journal_slices supports custom slices", async () => {
    const journal = mockJournalPort({
      listTrades: vi.fn().mockResolvedValue([sampleTrade, lossTrade]),
    });
    const result = await compareJournalSlicesTool.execute(
      {
        window: "all",
        sliceA: { ratingMin: 4 },
        sliceB: { ratingMax: 2 },
        labelA: "High",
        labelB: "Low",
      },
      mockContext(journal),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.preset).toBe("custom");
    expect(result.data.report.sliceA).toMatchObject({ label: "High", tradeCount: 1 });
    expect(result.data.report.sliceB).toMatchObject({ label: "Low", tradeCount: 1 });
  });

  it("open_journal_trade_on_chart loads symbol, interval, and goto", async () => {
    const journal = mockJournalPort();
    const layout = createLayout();
    const { context, loadSymbolIntoActiveChart, applyCellUpdate, goTo } = mockChartContext(
      journal,
      layout,
    );

    const result = await openJournalTradeOnChartTool.execute({ tradeId }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(loadSymbolIntoActiveChart).toHaveBeenCalledWith({
      symbol: "AAPL",
      name: "AAPL",
      exchange: "",
    });
    expect(applyCellUpdate).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ symbol: "AAPL", interval: "5m" }),
    );
    expect(goTo).toHaveBeenCalledWith({
      mode: "date",
      at: Date.parse(sampleTrade.openedAt),
    });
    expect(result.data).toMatchObject({
      symbol: "AAPL",
      interval: "5m",
      journalTradeId: tradeId,
      goto: Date.parse(sampleTrade.openedAt),
    });
    expect(result.data.deepLink).toContain("symbol=AAPL");
    expect(result.data.deepLink).toContain(`journalTrade=${tradeId}`);
  });

  it("open_journal_trade_on_chart returns not_found for missing trade", async () => {
    const journal = mockJournalPort({
      getTrade: vi.fn().mockResolvedValue(null),
    });
    const { context } = mockChartContext(journal, createLayout());
    const result = await openJournalTradeOnChartTool.execute({ tradeId }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_found");
  });
});
