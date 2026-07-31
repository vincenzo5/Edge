import type { CopilotToolStep } from "@/lib/copilot/types";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_app_state: "Workspace",
  get_chart_state: "Chart state",
  get_visible_candles: "Visible candles",
  get_candles: "Candles",
  get_quotes: "Quotes",
  get_fundamentals: "Fundamentals",
  search_symbols: "Symbol search",
  summarize_chart: "Chart summary",
  summarize_screen: "Screen summary",
  compare_symbols: "Compare symbols",
  set_symbol: "Set symbol",
  set_chart_range: "Set range",
  set_chart_type: "Set chart type",
  set_active_cell: "Active cell",
  set_grid_mode: "Grid layout",
  set_linked_mode: "Linked mode",
  set_theme: "Theme",
  go_to_date: "Go to date",
  prepare_chart_for_analysis: "Prepare chart",
  analyze_watchlist: "Analyze watchlist",
  list_drawings: "List drawings",
  add_drawing: "Add drawing",
  update_drawing: "Update drawing",
  delete_drawing: "Delete drawing",
  list_indicators: "List indicators",
  add_indicator: "Add indicator",
  remove_indicator: "Remove indicator",
  update_indicator: "Update indicator",
  preview_order: "Preview order",
  place_order: "Place order",
  get_research_board: "Research board",
  add_research_card: "Add research card",
};

export type ToolStepKind = "read" | "write" | "chart" | "order" | "search" | "other";

export const TRACE_CHIP_OVERFLOW = 4;

function titleCaseSnake(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toolStepDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? titleCaseSnake(toolName);
}

export function toolStepKind(step: Pick<CopilotToolStep, "name">): ToolStepKind {
  const name = step.name;
  if (name === "preview_order" || name === "place_order") return "order";
  if (name.includes("search")) return "search";
  if (
    name.includes("chart") ||
    name === "get_candles" ||
    name === "get_visible_candles" ||
    name === "go_to_date"
  ) {
    return "chart";
  }
  if (name.startsWith("get_") || name.startsWith("list_") || name.startsWith("summarize_")) {
    return "read";
  }
  if (
    name.startsWith("add_") ||
    name.startsWith("update_") ||
    name.startsWith("delete_") ||
    name.startsWith("set_") ||
    name.startsWith("remove_") ||
    name.startsWith("prepare_")
  ) {
    return "write";
  }
  return "other";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function toolStepTargetLabel(step: CopilotToolStep): string | null {
  const hint = step.artifactHint;
  if (hint?.type === "chart") {
    return hint.interval ? `${hint.symbol} · ${hint.interval}` : hint.symbol;
  }
  if (hint?.type === "screener") {
    return hint.queryLabel ?? hint.screenName ?? hint.title ?? null;
  }

  const args = step.confirmArguments;
  if (args) {
    const symbol = readString(args.symbol);
    const interval = readString(args.interval);
    if (symbol && interval) return `${symbol} · ${interval}`;
    if (symbol) return symbol;
    const name = readString(args.name);
    if (name) return name;
  }

  const summary = step.summary?.trim();
  if (!summary) return null;

  const symbolInterval = summary.match(/^([A-Z][A-Z0-9.-]{0,15})\s·\s(.+)$/i);
  if (symbolInterval?.[1] && symbolInterval[2]) {
    const tail = symbolInterval[2].trim();
    if (tail.length <= 32) {
      return `${symbolInterval[1]} · ${tail}`;
    }
  }

  const atPrice = summary.match(/@\s([\d.]+)/);
  if (atPrice?.[1]) return `@ ${atPrice[1]}`;

  if (summary.length <= 48 && !summary.includes("\n")) {
    return summary;
  }

  return null;
}

export function formatTraceDisclosureLabel(input: {
  stepCount: number;
  hasRunning: boolean;
  durationSec?: number;
}): string {
  const { stepCount, hasRunning, durationSec } = input;
  if (stepCount <= 0) return "Thinking";
  if (hasRunning) {
    return stepCount === 1 ? "Thinking" : `Thinking · ${stepCount}`;
  }
  if (durationSec != null && durationSec >= 0) {
    return `Thought for ${durationSec}s`;
  }
  return stepCount === 1 ? "1 tool" : `${stepCount} tools`;
}

/** @deprecated Prefer formatTraceDisclosureLabel */
export function formatStepsDisclosureLabel(stepCount: number, hasRunning: boolean): string {
  return formatTraceDisclosureLabel({ stepCount, hasRunning });
}

export function formatTraceChipSummary(stepCount: number): string | null {
  if (stepCount <= 1) return null;
  return `${stepCount} tool calls`;
}
