import type { IndicatorConfig } from "@/lib/chart/contracts";
import type { Candle, Theme } from "@/lib/chart/contracts";
import type { CellConfig } from "@/lib/chartConfig";

export type DataWindowProps = {
  dataIndex: number | null;
  candles: Candle[];
  indicators: IndicatorConfig[];
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: CellConfig["interval"];
  theme: Theme;
  chartSettings?: CellConfig["chartSettings"];
  mainSeriesVisible?: boolean;
  dataMeta?: {
    source: string;
    asOf?: number;
    stale?: boolean;
    warnings?: string[];
    streaming?: boolean;
    streamError?: string | null;
    lastUpdateAt?: number;
  } | null;
};

export type ObjectTreePaneActions = {
  onPaneFocus: (cellIndex: number) => void;
  onToggleIndicatorVisible: (cellIndex: number, indicatorId: string) => void;
  onRemoveIndicator: (cellIndex: number, indicatorId: string) => void;
  onAddIndicator: (cellIndex: number) => void;
  onDrawingSetVisible: (cellIndex: number, drawingId: string, visible: boolean) => void;
  onDrawingSetLocked: (cellIndex: number, drawingId: string, locked: boolean) => void;
  onDrawingRemove: (cellIndex: number, drawingId: string) => void;
  onDrawingRename: (cellIndex: number, drawingId: string, label: string) => void;
  onDrawingBringForward: (cellIndex: number, drawingId: string) => void;
  onSelectDrawing: (cellIndex: number, drawingId: string) => void;
  subscribeOverlayChanges?: (cb: () => void) => () => void;
};

export type PanelTab = "object-tree" | "data-window";

export const TAB_STORAGE_PREFIX = "tv-ai:object-panel-tab:";

export function loadActiveTab(panelKey: string): PanelTab {
  if (typeof window === "undefined") return "object-tree";
  try {
    const raw = localStorage.getItem(`${TAB_STORAGE_PREFIX}${panelKey}`);
    if (raw === "data-window" || raw === "object-tree") return raw;
  } catch { /* ignore */ }
  return "object-tree";
}

export function saveActiveTab(panelKey: string, tab: PanelTab) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}${panelKey}`, tab);
  } catch { /* ignore */ }
}
