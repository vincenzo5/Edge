import type { BaseToolContext } from "@edge/ai-tools-core";
import type {
  CellConfig,
  ChartLayout,
  GridMode,
  LayoutSyncPrefs,
  SidebarPanelId,
  Theme,
} from "@/lib/chartConfig";
import type { Interval } from "@edge/chart-core";
import type { Range } from "@/lib/yahoo";
import type { SymbolSelectResult, WatchlistState } from "@/lib/watchlist/types";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { MarketDataPort } from "./marketDataPort";

export type { BaseToolContext };

export type AppActions = {
  getLayout: () => ChartLayout;
  isHydrated: () => boolean;
  applyCellUpdate: (index: number, next: CellConfig) => void;
  patchActiveCell: (patch: Partial<CellConfig>) => void;
  setActiveCellIndex: (index: number) => void;
  setGridMode: (mode: GridMode) => void;
  setLayoutSync: (patch: Partial<LayoutSyncPrefs>) => void;
  setTheme: (theme: Theme) => void;
  setSidebarPanel: (panel: SidebarPanelId | null) => void;
};

export type WatchlistActions = {
  getState: () => WatchlistState;
  setState: (updater: (prev: WatchlistState) => WatchlistState) => void;
};

export type ChartBridgeActions = {
  getActiveChart: () => ActiveChartSnapshot | null;
  loadSymbolIntoActiveChart: (result: SymbolSelectResult) => void;
};

/** Snapshot passed to tool executors at call time. */
export type ToolContext = BaseToolContext & {
  app: AppActions | null;
  chart: ChartBridgeActions | null;
  watchlist: WatchlistActions | null;
  marketData: MarketDataPort;
};

export type ChartRangeInput = {
  range: Range;
  interval: Interval;
};
