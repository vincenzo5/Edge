import type {
  CellConfig,
  ChartLayout,
  ChartType,
  GridMode,
  SidebarPanelId,
  Theme,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import type { Range } from "@/lib/yahoo";
import type { SymbolSelectResult, WatchlistState } from "@/lib/watchlist/types";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { MarketDataPort } from "./marketDataPort";

export type AppActions = {
  getLayout: () => ChartLayout;
  isHydrated: () => boolean;
  applyCellUpdate: (index: number, next: CellConfig) => void;
  patchActiveCell: (patch: Partial<CellConfig>) => void;
  setActiveCellIndex: (index: number) => void;
  setGridMode: (mode: GridMode) => void;
  setLinked: (linked: boolean) => void;
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
export type ToolContext = {
  /** When false, client-state tools should no-op or return an error. */
  clientSession: boolean;
  app: AppActions | null;
  chart: ChartBridgeActions | null;
  watchlist: WatchlistActions | null;
  marketData: MarketDataPort;
};

export type ChartRangeInput = {
  range: Range;
  interval: Interval;
};
