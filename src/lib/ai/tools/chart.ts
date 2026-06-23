import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import {
  CHART_TYPES,
  GRID_MODES,
  INTERVALS,
  RANGES,
  THEMES,
  cellIndexSchema,
  symbolSchema,
} from "../schemas";
import { cellCountFor } from "@/lib/chartConfig";

function requireApp(context: ToolContext) {
  if (!context.app) {
    throw new Error("App actions unavailable");
  }
  return context.app;
}

function requireChart(context: ToolContext) {
  if (!context.chart) {
    throw new Error("Chart actions unavailable");
  }
  return context.chart;
}

function resolveCellIndex(context: ToolContext, cellIndex?: number): number {
  const app = requireApp(context);
  const layout = app.getLayout();
  const index = cellIndex ?? layout.activeCellIndex ?? 0;
  const max = cellCountFor(layout.gridMode) - 1;
  return Math.max(0, Math.min(index, max));
}

function getCellConfig(context: ToolContext, cellIndex?: number) {
  const app = requireApp(context);
  const layout = app.getLayout();
  const index = resolveCellIndex(context, cellIndex);
  return { layout, index, cell: layout.cells[index] };
}

export const getAppStateTool = defineTool({
  name: "get_app_state",
  description:
    "Read the current app layout: grid mode, linked mode, theme, active cell index, and per-cell symbol/range/interval/chart type.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const app = requireApp(context);
    const layout = app.getLayout();
    const count = cellCountFor(layout.gridMode);
    return {
      ok: true,
      data: {
        hydrated: app.isHydrated(),
        gridMode: layout.gridMode,
        linked: layout.linked,
        theme: layout.theme,
        activeCellIndex: layout.activeCellIndex ?? 0,
        sidebarPanel: layout.sidebar?.activePanel ?? null,
        cells: layout.cells.slice(0, count).map((cell, index) => ({
          index,
          symbol: cell.symbol,
          symbolName: cell.symbolName,
          exchange: cell.exchange,
          range: cell.range,
          interval: cell.interval,
          chartType: cell.chartType,
          indicatorCount: cell.indicators.length,
          drawingCount: cell.drawings.length,
        })),
      },
    };
  },
});

export const getChartStateTool = defineTool({
  name: "get_chart_state",
  description:
    "Read detailed state for a chart cell: full config, indicators, drawings, and active-chart overlay metadata when that cell is focused.",
  inputSchema: z.object({ cellIndex: cellIndexSchema }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { index, cell, layout } = getCellConfig(context, input.cellIndex);
    const chart = context.chart?.getActiveChart();
    const isActive =
      chart != null && (layout.activeCellIndex ?? 0) === index;

    return {
      ok: true,
      data: {
        cellIndex: index,
        isActive,
        config: cell,
        activeOverlays: isActive ? chart?.overlays ?? [] : [],
        dataWindow: isActive ? chart?.dataWindow ?? null : null,
      },
    };
  },
});

export const getVisibleCandlesTool = defineTool({
  name: "get_visible_candles",
  description:
    "Return OHLCV candles for the active chart when focused, or fetch candles for a cell's symbol/range/interval via market data.",
  inputSchema: z.object({
    cellIndex: cellIndexSchema,
    limit: z.number().int().min(1).max(500).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { index, cell, layout } = getCellConfig(context, input.cellIndex);
    const limit = input.limit ?? 100;
    const chart = context.chart?.getActiveChart();
    const isActive = (layout.activeCellIndex ?? 0) === index;

    if (isActive && chart?.chartCommands) {
      const candles = chart.chartCommands.getCandles();
      return {
        ok: true,
        data: {
          source: "active_chart" as const,
          symbol: cell.symbol,
          count: Math.min(candles.length, limit),
          candles: candles.slice(-limit),
        },
      };
    }

    const candles = await context.marketData.getCandles({
      symbol: cell.symbol,
      range: cell.range,
      interval: cell.interval,
    });
    return {
      ok: true,
      data: {
        source: "market_data" as const,
        symbol: cell.symbol,
        count: Math.min(candles.length, limit),
        candles: candles.slice(-limit),
      },
    };
  },
});

export const setActiveCellTool = defineTool({
  name: "set_active_cell",
  description: "Focus a chart cell by index so drawing tools and header actions apply to it.",
  inputSchema: z.object({ cellIndex: z.number().int().min(0) }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context).setActiveCellIndex(input.cellIndex);
    return { ok: true, data: { activeCellIndex: input.cellIndex } };
  },
});

export const setGridModeTool = defineTool({
  name: "set_grid_mode",
  description: "Change the multi-chart grid layout.",
  inputSchema: z.object({ gridMode: z.enum(GRID_MODES) }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context).setGridMode(input.gridMode);
    return { ok: true, data: { gridMode: input.gridMode } };
  },
});

export const setLinkedModeTool = defineTool({
  name: "set_linked_mode",
  description:
    "Enable or disable linked mode. When linked, symbol/range/interval changes propagate to all visible cells.",
  inputSchema: z.object({ linked: z.boolean() }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context).setLinked(input.linked);
    return { ok: true, data: { linked: input.linked } };
  },
});

export const setThemeTool = defineTool({
  name: "set_theme",
  description: "Switch the app theme between light and dark.",
  inputSchema: z.object({ theme: z.enum(THEMES) }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context).setTheme(input.theme);
    return { ok: true, data: { theme: input.theme } };
  },
});

export const setSymbolTool = defineTool({
  name: "set_symbol",
  description:
    "Load a symbol into the active chart (or specified cell). When linked, propagates to all cells.",
  inputSchema: z.object({
    symbol: symbolSchema,
    name: z.string().optional(),
    exchange: z.string().optional(),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const app = requireApp(context);
    const layout = app.getLayout();
    const index = resolveCellIndex(context, input.cellIndex);
    const patch = {
      symbol: input.symbol,
      symbolName: input.name ?? input.symbol,
      exchange: input.exchange ?? "",
    };

    if (index === (layout.activeCellIndex ?? 0)) {
      requireChart(context).loadSymbolIntoActiveChart({
        symbol: patch.symbol,
        name: patch.symbolName,
        exchange: patch.exchange,
      });
    } else {
      const cell = layout.cells[index];
      app.applyCellUpdate(index, { ...cell, ...patch });
    }

    return { ok: true, data: { cellIndex: index, symbol: input.symbol } };
  },
});

export const setChartRangeTool = defineTool({
  name: "set_chart_range",
  description: "Set the range and interval for the active or specified chart cell.",
  inputSchema: z.object({
    range: z.enum(RANGES),
    interval: z.enum(INTERVALS),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const app = requireApp(context);
    const { index, cell } = getCellConfig(context, input.cellIndex);
    app.applyCellUpdate(index, {
      ...cell,
      range: input.range,
      interval: input.interval,
      rangePreset: null,
    });
    return {
      ok: true,
      data: { cellIndex: index, range: input.range, interval: input.interval },
    };
  },
});

export const setChartTypeTool = defineTool({
  name: "set_chart_type",
  description: "Change the chart visual style (candles, OHLC, area, Heikin Ashi, etc.).",
  inputSchema: z.object({
    chartType: z.enum(CHART_TYPES),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const app = requireApp(context);
    const { index, cell } = getCellConfig(context, input.cellIndex);
    app.applyCellUpdate(index, { ...cell, chartType: input.chartType });
    return {
      ok: true,
      data: { cellIndex: index, chartType: input.chartType },
    };
  },
});

export const goToDateTool = defineTool({
  name: "go_to_date",
  description:
    "Navigate the active chart viewport to a specific timestamp. Requires the cell to be active/focused.",
  inputSchema: z.object({
    timestamp: z.number(),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { index, layout } = getCellConfig(context, input.cellIndex);
    if ((layout.activeCellIndex ?? 0) !== index) {
      return {
        ok: false,
        error: "go_to_date requires the target cell to be the active chart",
        code: "execution",
      };
    }
    const chart = context.chart?.getActiveChart();
    if (!chart?.chartCommands) {
      return {
        ok: false,
        error: "Active chart commands unavailable",
        code: "execution",
      };
    }
    const result = await chart.chartCommands.goTo({ mode: "date", at: input.timestamp });
    return { ok: true, data: result };
  },
});

export const chartTools: AiTool[] = [
  getAppStateTool,
  getChartStateTool,
  getVisibleCandlesTool,
  setActiveCellTool,
  setGridModeTool,
  setLinkedModeTool,
  setThemeTool,
  setSymbolTool,
  setChartRangeTool,
  setChartTypeTool,
  goToDateTool,
];
