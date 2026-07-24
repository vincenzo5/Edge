import type { BaseToolContext } from "@edge/ai-tools-core";
import type {
  CellConfig,
  ChartLayout,
  LayoutTemplateId,
  LayoutSyncPrefs,
  SidebarPanelId,
  Theme,
} from "@/lib/chartConfig";
import type { Interval } from "@edge/chart-core";
import type { Range } from "@/lib/yahoo";
import type { SymbolSelectResult, WatchlistState } from "@/lib/watchlist/types";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { MarketDataPort } from "./marketDataPort";
import type { TradingPort } from "./tradingPort";
import type { JournalPort } from "./journalPort";
import type { AlertsPort } from "./alertsPort";

export type { BaseToolContext };

export type AppActions = {
  getLayout: () => ChartLayout;
  isHydrated: () => boolean;
  applyCellUpdate: (index: number, next: CellConfig) => void;
  patchActiveCell: (patch: Partial<CellConfig>) => void;
  setActiveCellIndex: (index: number) => void;
  setLayoutId: (layoutId: LayoutTemplateId) => void;
  /** @deprecated Use setLayoutId. */
  setGridMode: (layoutId: LayoutTemplateId) => void;
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

import type { ScreenerLastRun, ScreenerState } from "@/lib/screener/types";
import type { RiskSettings } from "@/lib/risk/riskSettings";
import type { AccountSnapshot } from "@/lib/brokerage/accountSnapshot";
import type { OptionsSessionState } from "@/lib/options/optionsSession";
import type { ScriptCompileResult, ScriptManifest } from "@edge/chart-core";
import type { ScriptLibraryEntry, ScriptLibraryState } from "@/lib/scriptLibrary/types";
import type { ResearchBoardPort } from "@/lib/research/researchBoardPort";

export type ScriptLibraryPort = {
  isHydrated: () => boolean;
  getError: () => string | null;
  getState: () => ScriptLibraryState;
  createScript: (params?: {
    displayName?: string;
    source?: string;
  }) => Promise<ScriptLibraryEntry>;
  renameScript: (scriptId: string, displayName: string) => Promise<ScriptLibraryEntry>;
  duplicateScript: (scriptId: string) => Promise<ScriptLibraryEntry | null>;
  deleteScript: (scriptId: string) => Promise<void>;
  saveDraft: (
    scriptId: string,
    source: string,
    dirty?: boolean,
    manifest?: ScriptManifest,
  ) => Promise<void>;
  saveRevision: (
    scriptId: string,
    params: { source: string; compile: ScriptCompileResult },
  ) => Promise<string>;
  getScript: (scriptId: string) => ScriptLibraryEntry | undefined;
  getRevisionSource: (
    scriptId: string,
    revision: string,
  ) => import("@/lib/scriptLibrary/types").ScriptRevisionRecord | null;
  getRevisionManifest: (
    scriptId: string,
    revision: string,
  ) => ScriptManifest | undefined;
};

export type ScreenerActions = {
  getState: () => ScreenerState;
  getLastRun: () => ScreenerLastRun | null;
};

export type RiskSettingsActions = {
  getRiskSettings: () => {
    settings: RiskSettings;
    dollarRisk: number | null;
    basisStale: boolean;
  };
};

export type AccountActions = {
  getSnapshot: () => AccountSnapshot;
};

export type OptionsSessionActions = {
  getSession: () => OptionsSessionState & {
    symbol: string | null;
    primaryExpiration: string | null;
    legCount: number;
  };
};

/** Snapshot passed to tool executors at call time. */
export type ToolContext = BaseToolContext & {
  app: AppActions | null;
  chart: ChartBridgeActions | null;
  watchlist: WatchlistActions | null;
  screener: ScreenerActions | null;
  risk: RiskSettingsActions | null;
  account: AccountActions | null;
  options: OptionsSessionActions | null;
  scriptLibrary: ScriptLibraryPort | null;
  marketData: MarketDataPort;
  trading: TradingPort | null;
  journal: JournalPort | null;
  alerts: AlertsPort | null;
  research: ResearchBoardPort | null;
};

export type ChartRangeInput = {
  range: Range;
  interval: Interval;
};
