import {
  cellCountFor,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  type ChartLayout,
  type LayoutTemplateId,
  type SidebarPrefs,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import { getTabPrimarySymbol, type WorkspaceTabsState } from "@/lib/app/workspaceTabs";

export type AppWorkspaceTabSummary = {
  id: string;
  title: string;
  active: boolean;
  symbol: string;
};

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
  activeTabId?: string;
  tabCount?: number;
  tabs?: AppWorkspaceTabSummary[];
  layoutId: LayoutTemplateId;
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
  tabsState?: WorkspaceTabsState,
): AppWorkspaceSnapshot {
  const count = cellCountFor(layout.layoutId);
  return {
    hydrated,
    ...(tabsState
      ? {
          activeTabId: tabsState.activeTabId,
          tabCount: tabsState.tabs.length,
          tabs: tabsState.tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            active: tab.id === tabsState.activeTabId,
            symbol: getTabPrimarySymbol(tab),
          })),
        }
      : {}),
    layoutId: layout.layoutId,
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
