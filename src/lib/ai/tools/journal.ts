import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import type { JournalPort } from "../journalPort";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { journalSetupValueSchema } from "@/lib/journal/journalSetupPreference";
import {
  buildComparePresetSlices,
  computeBreakdownReport,
  computeCompareReport,
  computeDailyPnL,
  computeEquityCurve,
  computeJournalStats,
  computeTimeBreakdownReport,
  filterJournalTrades,
  scopeClosedTradesForReporting,
  type CompareSlice,
  type JournalFilters,
  type JournalReportTradeInput,
  type JournalStatsWindow,
} from "@/lib/journal/journalStats";
import {
  buildChartDeepLink,
  chartSymbolForTrade,
  resolveChartInterval,
} from "@/lib/journal/chartDeepLink";
import { cellIndexSchema } from "../schemas";
import { getCell, requireApp } from "./_helpers";

const journalTradeListInputSchema = z.object({
  status: z.enum(["open", "closed", "all"]).optional(),
  symbol: z.string().trim().max(16).optional(),
  secType: z.string().trim().max(8).optional(),
  tag: z.string().trim().max(40).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

const journalSetupFilterSchema = z.union([journalSetupValueSchema, z.literal("all")]);

const journalStatsInputSchema = journalTradeListInputSchema.extend({
  window: z.enum(["today", "7d", "30d", "all"]).default("all"),
  setup: journalSetupFilterSchema.optional(),
  outcome: z.enum(["all", "win", "loss"]).optional(),
});

const journalTradeIdSchema = z.object({
  tradeId: z.string().uuid(),
});

const journalReviewPatchSchema = z
  .object({
    tradeId: z.string().uuid(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    setup: journalSetupValueSchema.nullable().optional(),
    reviewNote: z.string().trim().max(10000).nullable().optional(),
    plannedRiskMode: z.enum(["usd", "pct"]).nullable().optional(),
    plannedRiskValue: z.number().finite().positive().nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    ignored: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.tags !== undefined ||
      value.setup !== undefined ||
      value.reviewNote !== undefined ||
      value.plannedRiskMode !== undefined ||
      value.plannedRiskValue !== undefined ||
      value.rating !== undefined ||
      value.ignored !== undefined,
    { message: "At least one review field is required" },
  );

const compareSliceSchema = z
  .object({
    status: z.enum(["all", "open", "closed"]).optional(),
    symbol: z.string().trim().max(16).optional(),
    setup: journalSetupFilterSchema.optional(),
    tag: z.string().trim().max(40).optional(),
    outcome: z.enum(["all", "win", "loss"]).optional(),
    closedFrom: z.string().optional(),
    closedTo: z.string().optional(),
    rating: z
      .union([z.literal("all"), z.literal("unrated"), z.number().int().min(1).max(5)])
      .optional(),
    ratingMin: z.number().int().min(1).max(5).optional(),
    ratingMax: z.number().int().min(1).max(5).optional(),
  })
  .strict();

const compareJournalSlicesInputSchema = journalStatsInputSchema
  .extend({
    preset: z
      .enum(["wins_vs_losses", "last30_vs_prior30", "high_vs_low_rating"])
      .optional(),
    sliceA: compareSliceSchema.optional(),
    sliceB: compareSliceSchema.optional(),
    labelA: z.string().trim().min(1).max(80).optional(),
    labelB: z.string().trim().min(1).max(80).optional(),
  })
  .refine(
    (value) =>
      value.preset != null || (value.sliceA != null && value.sliceB != null),
    { message: "Provide preset or both sliceA and sliceB" },
  );

type JournalStatsInput = z.infer<typeof journalStatsInputSchema>;

function requireJournal(context: ToolContext): JournalPort {
  if (!context.journal) {
    throw new Error("Journal port unavailable");
  }
  return context.journal;
}

function requireChart(context: ToolContext) {
  if (!context.chart) {
    throw new Error("Chart actions unavailable");
  }
  return context.chart;
}

function toJournalFilters(input: JournalStatsInput): JournalFilters {
  return {
    status: input.status ?? "all",
    symbol: input.symbol,
    tag: input.tag,
    setup: (input.setup ?? "all") as JournalFilters["setup"],
    outcome: input.outcome ?? "all",
    closedFrom: input.from,
    closedTo: input.to,
  };
}

function filtersPayload(filters: JournalFilters) {
  return {
    status: filters.status ?? "all",
    symbol: filters.symbol ?? null,
    tag: filters.tag ?? null,
    setup: filters.setup ?? "all",
    outcome: filters.outcome ?? "all",
    from: filters.closedFrom ?? null,
    to: filters.closedTo ?? null,
  };
}

async function loadFilteredTrades(journal: JournalPort, input: JournalStatsInput) {
  const { window, setup, outcome, ...listQuery } = input;
  const trades = await journal.listTrades(listQuery);
  const filters = toJournalFilters({ ...listQuery, window, setup, outcome });
  const filtered = filterJournalTrades(trades as JournalReportTradeInput[], filters);
  return {
    trades,
    filtered,
    filters,
    window: window as JournalStatsWindow,
    listQuery,
  };
}

async function loadScopedClosedTrades(
  journal: JournalPort,
  input: JournalStatsInput,
  now = Date.now(),
) {
  const loaded = await loadFilteredTrades(journal, input);
  const scoped = scopeClosedTradesForReporting(
    loaded.trades as JournalReportTradeInput[],
    loaded.filters,
    loaded.window,
    now,
  );
  return { ...loaded, scoped };
}

function toTradeSummary(trade: JournalTradeResponse) {
  return {
    id: trade.id,
    symbol: trade.symbol,
    status: trade.status,
    direction: trade.direction,
    secType: trade.secType,
    netPnL: trade.netPnL,
    grossPnL: trade.grossPnL,
    setup: trade.setup ?? null,
    tags: trade.tags ?? [],
    rating: trade.rating ?? null,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt ?? null,
  };
}

export const listJournalTradesTool = defineTool({
  name: "list_journal_trades",
  description:
    "List journal trades with optional filters (status, symbol, tag, date range, limit). Returns compact trade summaries.",
  inputSchema: journalTradeListInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const trades = await journal.listTrades(input);
    return {
      ok: true,
      data: {
        count: trades.length,
        trades: trades.map(toTradeSummary),
      },
    };
  },
});

export const getJournalTradeTool = defineTool({
  name: "get_journal_trade",
  description: "Fetch one journal trade by id, including review fields and fill exec ids.",
  inputSchema: journalTradeIdSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const trade = await journal.getTrade(input.tradeId);
    if (!trade) {
      return {
        ok: false,
        error: "Journal trade not found",
        code: "not_found",
      };
    }
    return { ok: true, data: { trade } };
  },
});

export const getJournalStatsTool = defineTool({
  name: "get_journal_stats",
  description:
    "Compute journal performance stats (win rate, net P&L, profit factor, expectancy) for closed trades in a time window with optional filters.",
  inputSchema: journalStatsInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { filtered, filters, window } = await loadFilteredTrades(journal, input);
    const stats = computeJournalStats(filtered, window);
    return {
      ok: true,
      data: {
        window,
        filters: filtersPayload(filters),
        stats,
      },
    };
  },
});

export const updateJournalTradeReviewTool = defineTool({
  name: "update_journal_trade_review",
  description:
    "Patch journal trade review fields: setup, tags, reviewNote, rating, planned risk ($ or %), and ignored-from-stats flag.",
  inputSchema: journalReviewPatchSchema,
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { tradeId, ...patch } = input;
    const updated = await journal.patchTrade(tradeId, patch);
    if (!updated) {
      return {
        ok: false,
        error: "Journal trade not found",
        code: "not_found",
      };
    }
    return { ok: true, data: { trade: updated } };
  },
});

export const getJournalBreakdownTool = defineTool({
  name: "get_journal_breakdown",
  description:
    "Break down closed journal trades by setup, tag, or rating with win rate, net P&L, and profit factor per bucket.",
  inputSchema: journalStatsInputSchema.extend({
    dimension: z.enum(["setup", "tag", "rating"]),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { dimension, ...statsInput } = input;
    const { scoped, filters, window } = await loadScopedClosedTrades(journal, statsInput);
    const rows = computeBreakdownReport(scoped, dimension);
    return {
      ok: true,
      data: {
        dimension,
        window,
        filters: filtersPayload(filters),
        rows,
      },
    };
  },
});

export const getJournalTimeReportTool = defineTool({
  name: "get_journal_time_report",
  description:
    "Break down closed journal trades by hour or weekday (America/New_York) with win rate and net P&L per bucket.",
  inputSchema: journalStatsInputSchema.extend({
    dimension: z.enum(["hour", "weekday"]),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { dimension, ...statsInput } = input;
    const { scoped, filters, window } = await loadScopedClosedTrades(journal, statsInput);
    const rows = computeTimeBreakdownReport(scoped, dimension);
    return {
      ok: true,
      data: {
        dimension,
        timeZone: "America/New_York",
        window,
        filters: filtersPayload(filters),
        rows,
      },
    };
  },
});

export const getJournalEquityCurveTool = defineTool({
  name: "get_journal_equity_curve",
  description:
    "Compute a cumulative equity curve (daily trade P&L + running total) for scoped closed journal trades.",
  inputSchema: journalStatsInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { scoped, filters, window } = await loadScopedClosedTrades(journal, input);
    const points = computeEquityCurve(scoped);
    return {
      ok: true,
      data: {
        window,
        filters: filtersPayload(filters),
        points,
      },
    };
  },
});

export const getJournalDailyPnLTool = defineTool({
  name: "get_journal_daily_pnl",
  description:
    "Compute daily net P&L rows (date, trade count, wins/losses) for scoped closed journal trades.",
  inputSchema: journalStatsInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { scoped, filters, window } = await loadScopedClosedTrades(journal, input);
    const rows = computeDailyPnL(scoped);
    return {
      ok: true,
      data: {
        window,
        filters: filtersPayload(filters),
        rows,
      },
    };
  },
});

export const compareJournalSlicesTool = defineTool({
  name: "compare_journal_slices",
  description:
    "Compare two journal trade slices side-by-side (preset: wins vs losses, last/prior 30d, high vs low rating — or custom sliceA/sliceB filters).",
  inputSchema: compareJournalSlicesInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const { preset, sliceA, sliceB, labelA, labelB, ...statsInput } = input;
    const { scoped, filters, window } = await loadScopedClosedTrades(journal, statsInput);

    let resolvedA: CompareSlice;
    let resolvedB: CompareSlice;
    let resolvedLabelA: string;
    let resolvedLabelB: string;

    if (preset) {
      const built = buildComparePresetSlices(preset);
      resolvedA = built.sliceA;
      resolvedB = built.sliceB;
      resolvedLabelA = labelA ?? built.labelA;
      resolvedLabelB = labelB ?? built.labelB;
    } else {
      resolvedA = sliceA as CompareSlice;
      resolvedB = sliceB as CompareSlice;
      resolvedLabelA = labelA ?? "Slice A";
      resolvedLabelB = labelB ?? "Slice B";
    }

    const report = computeCompareReport(scoped, resolvedA, resolvedB, {
      a: resolvedLabelA,
      b: resolvedLabelB,
    });

    return {
      ok: true,
      data: {
        preset: preset ?? "custom",
        window,
        filters: filtersPayload(filters),
        sliceA: resolvedA,
        sliceB: resolvedB,
        report,
      },
    };
  },
});

export const openJournalTradeOnChartTool = defineTool({
  name: "open_journal_trade_on_chart",
  description:
    "Load a journal trade's symbol into the chart, set interval from trade duration, and go to the open time when the target cell is active.",
  inputSchema: z.object({
    tradeId: z.string().uuid(),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const journal = requireJournal(context);
    const trade = await journal.getTrade(input.tradeId);
    if (!trade) {
      return {
        ok: false,
        error: "Journal trade not found",
        code: "not_found",
      };
    }

    const symbol = chartSymbolForTrade(trade);
    const interval = resolveChartInterval(trade);
    const deepLink = buildChartDeepLink(trade, { interval });
    const goto = trade.openedAt ? Date.parse(trade.openedAt) : null;

    const app = requireApp(context);
    if (input.cellIndex != null) {
      app.setActiveCellIndex(input.cellIndex);
    }

    const { index, cell } = getCell(context, input.cellIndex);
    requireChart(context).loadSymbolIntoActiveChart({
      symbol,
      name: symbol,
      exchange: "",
    });
    app.applyCellUpdate(index, {
      ...cell,
      symbol,
      symbolName: symbol,
      interval,
      rangePreset: null,
    });

    let gotoResult: unknown = null;
    const activeIndex = app.getLayout().activeCellIndex ?? 0;
    if (activeIndex === index && goto != null && Number.isFinite(goto)) {
      const chart = context.chart?.getActiveChart();
      if (chart?.chartCommands?.goTo) {
        gotoResult = await chart.chartCommands.goTo({ mode: "date", at: goto });
      }
    }

    return {
      ok: true,
      data: {
        deepLink,
        symbol,
        interval,
        journalTradeId: trade.id,
        goto,
        cellIndex: index,
        gotoResult,
      },
    };
  },
});

export const journalTools: AiTool[] = [
  listJournalTradesTool,
  getJournalTradeTool,
  getJournalStatsTool,
  updateJournalTradeReviewTool,
  getJournalBreakdownTool,
  getJournalTimeReportTool,
  getJournalEquityCurveTool,
  getJournalDailyPnLTool,
  compareJournalSlicesTool,
  openJournalTradeOnChartTool,
];
