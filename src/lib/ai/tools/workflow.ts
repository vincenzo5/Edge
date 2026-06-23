import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import { IMPLEMENTED_INDICATORS, symbolSchema } from "../schemas";
import { cellCountFor, createIndicatorInstance } from "@/lib/chartConfig";
import { getActiveWatchlist } from "@/lib/watchlist/storage";
import {
  buildThesisSummary,
  summarizeAnnotations,
} from "@/lib/chart/annotationMetadata";
import type { SerializedDrawing } from "@/lib/chart/contracts";

const ANNOTATION_ITEM_CAP = 20;

function annotationItemsFromDrawings(drawings: SerializedDrawing[]) {
  return drawings
    .filter((d) => d.metadata?.kind)
    .slice(0, ANNOTATION_ITEM_CAP)
    .map((d) => ({
      id: d.id ?? null,
      type: d.name,
      kind: d.metadata?.kind ?? null,
      status: d.metadata?.status ?? null,
      source: d.metadata?.source ?? null,
      label: d.label,
      rationale: d.metadata?.rationale,
      price: d.points[0]?.value ?? null,
      timestamp: d.points[0]?.timestamp ?? null,
    }));
}

export const summarizeChartTool = defineTool({
  name: "summarize_chart",
  description:
    "Produce a structured summary of the active chart: symbol, range, indicators, drawing count, and recent price action.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    if (!context.app || !context.chart) {
      throw new Error("App/chart context unavailable");
    }
    const layout = context.app.getLayout();
    const index = layout.activeCellIndex ?? 0;
    const cell = layout.cells[index];
    const active = context.chart.getActiveChart();
    const candles = active?.chartCommands?.getCandles() ?? [];
    const recent = candles.slice(-5);
    const last = recent[recent.length - 1];
    const annotationSummary = summarizeAnnotations(cell.drawings);
    const items = annotationItemsFromDrawings(cell.drawings);

    return {
      ok: true,
      data: {
        cellIndex: index,
        symbol: cell.symbol,
        symbolName: cell.symbolName,
        exchange: cell.exchange,
        range: cell.range,
        interval: cell.interval,
        chartType: cell.chartType,
        indicators: cell.indicators.map((i) => ({
          id: i.id,
          name: i.name,
          pane: i.pane,
          visible: i.visible,
        })),
        drawingCount: cell.drawings.length,
        overlayCount: active?.overlays.length ?? 0,
        annotations: {
          total: annotationSummary.total,
          byKind: annotationSummary.byKind,
          byStatus: annotationSummary.byStatus,
          proposedCount: annotationSummary.proposedCount,
          items,
          thesisSummary: buildThesisSummary(cell.drawings),
        },
        recentCandles: recent,
        lastClose: last?.c ?? null,
        lastChange:
          recent.length >= 2 && last
            ? last.c - recent[recent.length - 2]!.c
            : null,
      },
    };
  },
});

const compareSymbolsSchema = z.object({
  symbols: z.array(symbolSchema).min(2).max(4),
  range: z
    .enum(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"])
    .optional(),
  interval: z
    .enum(["1m", "5m", "15m", "30m", "1h", "2h", "1d", "1wk", "1mo"])
    .optional(),
});

export const compareSymbolsTool = defineTool({
  name: "compare_symbols",
  description:
    "Set up a multi-chart layout to compare up to four symbols with the same range and interval.",
  inputSchema: compareSymbolsSchema,
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    if (!context.app) throw new Error("App actions unavailable");
    const gridModes = ["2x1", "1x2", "3x1", "2x2"] as const;
    const gridMode = gridModes[input.symbols.length - 2] ?? "2x1";
    const range = input.range ?? "1y";
    const interval = input.interval ?? "1d";

    context.app.setGridMode(gridMode);
    context.app.setLinked(false);

    const layout = context.app.getLayout();
    const count = cellCountFor(gridMode);
    for (let i = 0; i < count && i < input.symbols.length; i++) {
      const cell = layout.cells[i];
      context.app.applyCellUpdate(i, {
        ...cell,
        symbol: input.symbols[i],
        symbolName: input.symbols[i],
        range,
        interval,
        rangePreset: null,
      });
    }

    return {
      ok: true,
      data: { gridMode, symbols: input.symbols.slice(0, count), range, interval },
    };
  },
});

export const prepareChartForAnalysisTool = defineTool({
  name: "prepare_chart_for_analysis",
  description:
    "Load a symbol and add a standard analysis stack: MA, MACD, RSI, and volume on a daily 1Y chart.",
  inputSchema: z.object({
    symbol: symbolSchema,
    name: z.string().optional(),
    exchange: z.string().optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    if (!context.app || !context.chart) {
      throw new Error("App/chart context unavailable");
    }

    context.chart.loadSymbolIntoActiveChart({
      symbol: input.symbol,
      name: input.name ?? input.symbol,
      exchange: input.exchange ?? "",
    });

    const layout = context.app.getLayout();
    const index = layout.activeCellIndex ?? 0;
    const cell = layout.cells[index];

    const stack: Array<(typeof IMPLEMENTED_INDICATORS)[number]> = [
      "MA",
      "MACD",
      "RSI",
      "VOL",
    ];
    const indicators = stack.map((name) => {
      const pane = name === "MA" ? "main" : "sub";
      return createIndicatorInstance(name, pane);
    });

    context.app.applyCellUpdate(index, {
      ...cell,
      symbol: input.symbol,
      symbolName: input.name ?? input.symbol,
      exchange: input.exchange ?? "",
      range: "1y",
      interval: "1d",
      rangePreset: null,
      indicators,
      drawings: [],
    });

    return {
      ok: true,
      data: {
        symbol: input.symbol,
        range: "1y",
        interval: "1d",
        indicators: stack,
      },
    };
  },
});

export const analyzeWatchlistTool = defineTool({
  name: "analyze_watchlist",
  description:
    "Rank symbols in the active watchlist by quote change percent and return a summary.",
  inputSchema: z.object({
    watchlistId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    if (!context.watchlist) throw new Error("Watchlist unavailable");
    let state = context.watchlist.getState();
    if (
      input.watchlistId &&
      input.watchlistId !== state.activeWatchlistId
    ) {
      state = {
        ...state,
        activeWatchlistId: input.watchlistId,
      };
    }
    const list = getActiveWatchlist(state);
    const symbols = list.items.map((i) => i.symbol);
    if (symbols.length === 0) {
      return { ok: true, data: { watchlist: list.name, ranked: [] } };
    }

    const quotes = await context.marketData.getQuotes(symbols);
    const ranked = quotes
      .slice()
      .sort(
        (a, b) =>
          (b.regularMarketChangePercent ?? -Infinity) -
          (a.regularMarketChangePercent ?? -Infinity),
      )
      .slice(0, input.limit ?? symbols.length)
      .map((q) => ({
        symbol: q.symbol,
        price: q.regularMarketPrice,
        changePercent: q.regularMarketChangePercent,
        volume: q.regularMarketVolume,
      }));

    return {
      ok: true,
      data: {
        watchlist: list.name,
        symbolCount: symbols.length,
        ranked,
      },
    };
  },
});

export const workflowTools: AiTool[] = [
  summarizeChartTool,
  compareSymbolsTool,
  prepareChartForAnalysisTool,
  analyzeWatchlistTool,
];
