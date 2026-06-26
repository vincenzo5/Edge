import { z } from "zod";
import { defineTool } from "@edge/ai-tools-core";
import type { AiTool, ToolResult } from "@edge/ai-tools-core";
import {
  createDefaultChartState,
  getAllIndicators,
  restoreChartState,
  serializeChartState,
  type SerializedChartState,
} from "@edge/chart-core";
import type { ChartToolContext } from "./context";

const CHART_TYPES = [
  "candle_solid",
  "candle_stroke",
  "ohlc",
  "area",
  "heikin_ashi",
] as const;

const STARTER_INDICATORS = ["MA", "EMA", "BOLL", "MACD", "RSI", "VOL"] as const;

function requireChart(context: ChartToolContext) {
  if (!context.clientSession) {
    throw new Error("Chart session unavailable");
  }
  return context.chart;
}

function defineChartTool<TSchema extends z.ZodType>(
  tool: {
    name: string;
    description: string;
    inputSchema: TSchema;
    permission: "read" | "write" | "destructive";
    requiresConfirmation: boolean;
    requiresClientSession?: boolean;
    execute: (input: z.infer<TSchema>, context: ChartToolContext) => Promise<ToolResult>;
  },
): AiTool<ChartToolContext> {
  return defineTool<TSchema, ChartToolContext>(tool);
}

export const getChartStateTool = defineChartTool({
  name: "get_chart_state",
  description:
    "Read the serialized chart state: chart type, indicators, drawings, panes, and settings.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const chart = requireChart(context);
    const state = chart.getState();
    return {
      ok: true,
      data: {
        symbol: chart.getSymbol(),
        state,
        visibleRange: chart.getVisibleRange(),
      },
    };
  },
});

export const summarizeChartTool = defineChartTool({
  name: "summarize_chart",
  description: "Return a compact summary of the active chart for agents.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const chart = requireChart(context);
    const state = chart.getState();
    return {
      ok: true,
      data: {
        symbol: chart.getSymbol(),
        chartType: state.chartType,
        indicatorCount: state.indicators.length,
        drawingCount: state.drawings.length,
        indicators: state.indicators.map((i) => ({ id: i.id, name: i.name, pane: i.pane })),
        drawingNames: state.drawings.map((d) => d.name),
      },
    };
  },
});

export const listSupportedIndicatorsTool = defineChartTool({
  name: "list_supported_indicators",
  description: "List starter indicators available in the public chart registry.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: false,
  async execute() {
    return {
      ok: true,
      data: {
        starter: [...STARTER_INDICATORS],
        registered: getAllIndicators().map((i) => i.name),
      },
    };
  },
});

export const setChartTypeTool = defineChartTool({
  name: "set_chart_type",
  description: "Change the chart visual style using public chart state.",
  inputSchema: z.object({ chartType: z.enum(CHART_TYPES) }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const chart = requireChart(context);
    const current = chart.getState();
    const next = restoreChartState(
      serializeChartState({ ...current, chartType: input.chartType }),
    );
    chart.setState(next);
    return { ok: true, data: { chartType: next.chartType } };
  },
});

export const addIndicatorTool = defineChartTool({
  name: "add_indicator",
  description: "Add a starter indicator to the chart state by name.",
  inputSchema: z.object({
    name: z.enum(STARTER_INDICATORS),
    pane: z.enum(["main", "sub"]).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const chart = requireChart(context);
    const current = chart.getState();
    const plugin = getAllIndicators().find((i) => i.name === input.name);
    if (!plugin) {
      return { ok: false, error: `Unknown indicator ${input.name}`, code: "not_found" };
    }
    const pane = input.pane ?? plugin.pane;
    const instance = {
      id: `${input.name.toLowerCase()}-${Date.now()}`,
      name: input.name,
      pane,
      visible: true,
    };
    const next = restoreChartState(
      serializeChartState({
        ...current,
        indicators: [...current.indicators, instance],
      }),
    );
    chart.setState(next);
    return { ok: true, data: { indicator: instance } };
  },
});

export const clearDrawingsTool = defineChartTool({
  name: "clear_drawings",
  description: "Remove all drawings from the chart state.",
  inputSchema: z.object({}),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(_input, context) {
    const chart = requireChart(context);
    const current = chart.getState();
    const next = restoreChartState(
      serializeChartState({ ...current, drawings: [] }),
    );
    chart.setState(next);
    return { ok: true, data: { drawingCount: 0 } };
  },
});

export const chartSessionTools: AiTool<ChartToolContext>[] = [
  getChartStateTool,
  summarizeChartTool,
  listSupportedIndicatorsTool,
  setChartTypeTool,
  addIndicatorTool,
  clearDrawingsTool,
];

export function createChartSessionTools(): AiTool<ChartToolContext>[] {
  return [...chartSessionTools];
}

/** In-memory chart session for examples and tests. */
export function createInMemoryChartSession(initial?: {
  symbol?: string;
  state?: SerializedChartState;
}): ChartToolContext["chart"] {
  let state = initial?.state ?? createDefaultChartState();
  let symbol = initial?.symbol ?? "DEMO";
  return {
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    getVisibleRange: () => null,
    getSymbol: () => symbol,
  };
}
