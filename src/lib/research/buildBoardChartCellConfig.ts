import type { Interval } from "@edge/chart-core/contracts";
import { DEFAULT_CELL, type CellConfig } from "@/lib/chartConfig";

import type { ResearchCardSketch } from "./sessionSketch";

type ChartResearchCardSketch = Extract<ResearchCardSketch, { type: "chart" }>;

/** Build a minimal ChartCell config for a board chart card host. */
export function buildBoardChartCellConfig(card: ChartResearchCardSketch): CellConfig {
  return {
    ...DEFAULT_CELL,
    symbol: card.symbol.trim().toUpperCase(),
    interval: card.interval as Interval,
    range: DEFAULT_CELL.range,
    rangePreset: null,
    indicators: [],
    drawings: [],
    paneOrder: undefined,
    collapsedPanes: undefined,
    maximizedPane: null,
    paneHeights: undefined,
    viewport: undefined,
  };
}
