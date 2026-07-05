import { CHART_TOOL_ICONS } from "./ChartToolIcons";

export type DrawingToolName = keyof typeof CHART_TOOL_ICONS;

export type ToolGroupItem = {
  name: DrawingToolName;
  label: string;
};

export type ToolGroup = {
  id: string;
  label: string;
  defaultTool: DrawingToolName;
  tools: ToolGroupItem[];
};

/** Drawing tools grouped TradingView-style (lines, shapes, annotation). */
export const DRAWING_TOOL_GROUPS: ToolGroup[] = [
  {
    id: "lines",
    label: "Lines",
    defaultTool: "straightLine",
    tools: [
      { name: "straightLine", label: "Trend Line" },
      { name: "horizontalStraightLine", label: "Horizontal Line" },
      { name: "verticalStraightLine", label: "Vertical Line" },
      { name: "rayLine", label: "Ray" },
      { name: "priceLine", label: "Price Line" },
    ],
  },
  {
    id: "shapes",
    label: "Channels & Shapes",
    defaultTool: "parallelStraightLine",
    tools: [
      { name: "parallelStraightLine", label: "Parallel Channel" },
      { name: "priceChannelLine", label: "Price Channel" },
      { name: "rect", label: "Rectangle" },
      { name: "circle", label: "Circle" },
      { name: "fibonacciLine", label: "Fib Retracement" },
    ],
  },
  {
    id: "annotation",
    label: "Annotation",
    defaultTool: "simpleAnnotation",
    tools: [{ name: "simpleAnnotation", label: "Text" }],
  },
  {
    id: "forecasting",
    label: "Forecasting",
    defaultTool: "longPosition",
    tools: [
      { name: "longPosition", label: "Long Position" },
      { name: "shortPosition", label: "Short Position" },
    ],
  },
];

/** Standalone utility tools (TV §6.9) — not in a flyout group. */
export const MEASURE_TOOL: DrawingToolName = "measure";
export const RULER_TOOL: DrawingToolName = "rulerTool";
export const RISK_RULER_TOOL: DrawingToolName = "riskRuler";

const ALL_GROUPED = new Set(
  DRAWING_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.name)),
);

export function findGroupForTool(toolName: string): ToolGroup | undefined {
  return DRAWING_TOOL_GROUPS.find((g) => g.tools.some((t) => t.name === toolName));
}

export function isGroupedDrawingTool(toolName: string): toolName is DrawingToolName {
  return ALL_GROUPED.has(toolName as DrawingToolName);
}

export function initialGroupSelections(): Record<string, DrawingToolName> {
  return Object.fromEntries(
    DRAWING_TOOL_GROUPS.map((g) => [g.id, g.defaultTool]),
  );
}

export function getToolIcon(name: DrawingToolName) {
  return CHART_TOOL_ICONS[name];
}
