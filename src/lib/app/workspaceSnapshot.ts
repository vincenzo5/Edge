import {
  cellCountFor,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  type ChartLayout,
  type GridMode,
  type SidebarPrefs,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";

export type AppWorkspaceCellSummary = {
  index: number;
  symbol: string;
  symbolName?: string;
  exchange?: string;
  range: string;
  interval: string;
  chartType: string;
  indicatorCount: number;
  drawingCount: number;
};

export type AppWorkspaceSnapshot = {
  hydrated: boolean;
  gridMode: GridMode;
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  theme: Theme;
  activeCellIndex: number;
  toolbarPrefs: ToolbarPrefs;
  sidebar: SidebarPrefs;
  cells: AppWorkspaceCellSummary[];
};

export function buildAppWorkspaceSnapshot(
  layout: ChartLayout,
  hydrated: boolean,
): AppWorkspaceSnapshot {
  const count = cellCountFor(layout.gridMode);
  return {
    hydrated,
    gridMode: layout.gridMode,
    linkSymbol: layout.linkSymbol,
    linkInterval: layout.linkInterval,
    linkCrosshair: layout.linkCrosshair,
    linkDrawings: layout.linkDrawings,
    theme: layout.theme,
    activeCellIndex: layout.activeCellIndex ?? 0,
    toolbarPrefs: layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS,
    sidebar: layout.sidebar ?? DEFAULT_SIDEBAR_PREFS,
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
  };
}
