import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { ToolContext } from "../context";
import { cellCountFor } from "@/lib/chartConfig";

export function requireApp(context: ToolContext) {
  if (!context.app) {
    throw new Error("App actions unavailable");
  }
  return context.app;
}

export function getCell(context: ToolContext, cellIndex?: number) {
  const layout = requireApp(context).getLayout();
  const index = cellIndex ?? layout.activeCellIndex ?? 0;
  const max = cellCountFor(layout.layoutId) - 1;
  const resolved = Math.max(0, Math.min(index, max));
  return { layout, index: resolved, cell: layout.cells[resolved] };
}

export function requireActiveChart(
  context: ToolContext,
  cellIndex?: number,
): ActiveChartSnapshot {
  const { layout, index } = getCell(context, cellIndex);
  if ((layout.activeCellIndex ?? 0) !== index) {
    throw new Error("Drawing commands require the target cell to be active");
  }
  const chart = context.chart?.getActiveChart();
  if (!chart?.chartCommands) {
    throw new Error("Active chart commands unavailable");
  }
  return chart;
}
