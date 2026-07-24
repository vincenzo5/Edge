import type { ChartLayout } from "@/lib/chartConfig";

export function layoutHasScriptIndicators(layout: ChartLayout): boolean {
  return layout.cells.some((cell) =>
    cell.indicators.some((indicator) => indicator.kind === "script" && indicator.scriptId),
  );
}
