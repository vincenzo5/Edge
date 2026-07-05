"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CellConfig, Theme, TrackedOverlay, SerializedDrawing } from "@/lib/chartConfig";
import type { Candle, DrawingStyles } from "@/lib/chart/contracts";
import type { ChartDataMeta } from "@edge/chart-core";
import type { GoToRequest, GoToResult } from "@/lib/chart/goTo";
import type { SnapshotAction, SnapshotCaptureOptions } from "@/lib/chart/chartSnapshot";
import type { DataWindowProps } from "./ObjectTree";

export type ActiveChartCommands = {
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  goTo: (req: GoToRequest) => Promise<GoToResult>;
  zoomIn: () => void;
  resetChartView: () => void;
  getCandles: () => Candle[];
  selectDrawing: (id: string | null) => void;
  getSelectedDrawingId: () => string | null;
  updateDrawingStyles: (id: string, patch: Partial<DrawingStyles>) => void;
  restoreDrawings: (data: SerializedDrawing[]) => void;
  canCaptureSnapshot: () => boolean;
  captureSnapshot: (opts?: SnapshotCaptureOptions) => Promise<Blob>;
};

export type ActiveChartOverlayActions = {
  remove: (id: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  rename: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicate: (id: string) => void;
  subscribe: (cb: () => void) => () => void;
};

export type ActiveChartHeaderActions = {
  openSettings: () => void;
  openStudyTemplate: () => void;
  openChartTemplate: () => void;
  toggleReplay: () => void;
  undo: () => void;
  redo: () => void;
  addFavoriteIndicator: (name: string) => void;
};

export type ActiveChartHeaderState = {
  replayActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export type ActiveChartHeaderCommands = ActiveChartHeaderState & ActiveChartHeaderActions;

export type ActiveChartDataWindowActions = {
  setPriceVisible: (visible: boolean) => void;
  setOhlcVisible: (visible: boolean) => void;
  setVolumeVisible: (visible: boolean) => void;
  setIndicatorVisible: (id: string, visible: boolean) => void;
};

export type ActiveChartDrawingCommands = {
  hasSelection: () => boolean;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  renameSelected: () => void;
  toggleLockSelected: () => void;
  copySelected: () => void;
  pasteDrawings: () => void;
  canPaste: () => boolean;
};

export type ActiveChartUICommands = {
  openGoTo: () => void;
  runSnapshot: (action: SnapshotAction) => void | Promise<void>;
};

export type ActiveChartDrawingToolbarState = {
  activeTool: string;
  allLocked: boolean;
  allHidden: boolean;
  hasSelection: boolean;
};

export type ActiveChartDrawingToolbarActions = {
  selectTool: (toolName: string) => void;
  clearDrawings: () => void;
  toggleLockAll: () => void;
  toggleHideAll: () => void;
  toggleMagnet: (on: boolean) => void;
  toggleKeepDrawing: (on: boolean) => void;
  deleteSelected: () => void;
  zoomIn: () => void;
};

/** Stable command refs — identity should stay fixed between crosshair/data-window ticks. */
export type ActiveChartCommandRefs = {
  chartCommands: ActiveChartCommands;
  drawingCommands: ActiveChartDrawingCommands;
  drawingToolbarActions: ActiveChartDrawingToolbarActions;
  overlayActions: ActiveChartOverlayActions;
  dataWindowActions: ActiveChartDataWindowActions;
  uiCommands: ActiveChartUICommands;
  headerActions: ActiveChartHeaderActions;
  onConfigChange: (next: CellConfig) => void;
  openIndicatorPicker: () => void;
};

/** Versioned read state — may change on config, overlays, crosshair, or header flags. */
export type ActiveChartReadState = {
  chartId: string;
  config: CellConfig;
  theme: Theme;
  overlays: TrackedOverlay[];
  dataWindow: DataWindowProps;
  dataMeta?: ChartDataMeta | null;
  headerState: ActiveChartHeaderState;
  drawingToolbarState: ActiveChartDrawingToolbarState;
};

export type ActiveChartSnapshot = ActiveChartReadState &
  ActiveChartCommandRefs & {
    headerCommands: ActiveChartHeaderCommands;
  };

export type ActiveChartRegistration = ActiveChartCommandRefs & {
  readState: Omit<ActiveChartReadState, "chartId">;
};

type ActiveChartContextValue = {
  register: (chartId: string, payload: ActiveChartRegistration) => void;
  unregister: (chartId: string) => void;
  getSnapshot: () => ActiveChartSnapshot | null;
  subscribe: (listener: () => void) => () => void;
};

const ActiveChartContext = createContext<ActiveChartContextValue | null>(null);

function buildSnapshot(
  chartId: string,
  payload: ActiveChartRegistration,
): ActiveChartSnapshot {
  const { readState, headerActions, ...commands } = payload;
  return {
    chartId,
    ...readState,
    ...commands,
    headerActions,
    headerCommands: {
      ...readState.headerState,
      ...headerActions,
    },
  };
}

function commandRefsEqual(
  prev: ActiveChartCommandRefs | null,
  next: ActiveChartCommandRefs,
): boolean {
  if (!prev) return false;
  return (
    prev.chartCommands === next.chartCommands &&
    prev.drawingCommands === next.drawingCommands &&
    prev.drawingToolbarActions === next.drawingToolbarActions &&
    prev.overlayActions === next.overlayActions &&
    prev.dataWindowActions === next.dataWindowActions &&
    prev.uiCommands === next.uiCommands &&
    prev.headerActions === next.headerActions &&
    prev.onConfigChange === next.onConfigChange &&
    prev.openIndicatorPicker === next.openIndicatorPicker
  );
}

function readStateNeedsNotify(
  prev: ActiveChartReadState | null,
  next: ActiveChartReadState,
): boolean {
  if (!prev) return true;
  if (prev.chartId !== next.chartId) return true;
  if (prev.config !== next.config) return true;
  if (prev.theme !== next.theme) return true;
  if (prev.overlays !== next.overlays) return true;
  if (prev.dataMeta !== next.dataMeta) return true;
  const prevHeader = prev.headerState;
  const nextHeader = next.headerState;
  if (
    prevHeader.replayActive !== nextHeader.replayActive ||
    prevHeader.canUndo !== nextHeader.canUndo ||
    prevHeader.canRedo !== nextHeader.canRedo
  ) {
    return true;
  }
  const prevToolbar = prev.drawingToolbarState;
  const nextToolbar = next.drawingToolbarState;
  if (
    prevToolbar.activeTool !== nextToolbar.activeTool ||
    prevToolbar.allLocked !== nextToolbar.allLocked ||
    prevToolbar.allHidden !== nextToolbar.allHidden ||
    prevToolbar.hasSelection !== nextToolbar.hasSelection
  ) {
    return true;
  }
  return false;
}

function dataWindowEqual(a: DataWindowProps, b: DataWindowProps): boolean {
  return (
    a.dataIndex === b.dataIndex &&
    a.candles === b.candles &&
    a.indicators === b.indicators &&
    a.symbol === b.symbol &&
    a.symbolName === b.symbolName &&
    a.exchange === b.exchange &&
    a.interval === b.interval &&
    a.theme === b.theme &&
    a.chartSettings === b.chartSettings &&
    a.mainSeriesVisible === b.mainSeriesVisible &&
    a.dataMeta === b.dataMeta
  );
}

function snapshotUnchanged(
  prev: ActiveChartSnapshot | null,
  next: ActiveChartSnapshot,
): boolean {
  if (!prev) return false;
  if (prev.chartId !== next.chartId) return false;
  if (prev.config !== next.config) return false;
  if (prev.theme !== next.theme) return false;
  if (prev.overlays !== next.overlays) return false;
  if (prev.dataMeta !== next.dataMeta) return false;
  if (!dataWindowEqual(prev.dataWindow, next.dataWindow)) return false;
  if (
    prev.headerState.replayActive !== next.headerState.replayActive ||
    prev.headerState.canUndo !== next.headerState.canUndo ||
    prev.headerState.canRedo !== next.headerState.canRedo
  ) {
    return false;
  }
  const prevToolbar = prev.drawingToolbarState;
  const nextToolbar = next.drawingToolbarState;
  if (
    prevToolbar.activeTool !== nextToolbar.activeTool ||
    prevToolbar.allLocked !== nextToolbar.allLocked ||
    prevToolbar.allHidden !== nextToolbar.allHidden ||
    prevToolbar.hasSelection !== nextToolbar.hasSelection
  ) {
    return false;
  }
  return commandRefsEqual(prev, next);
}

export function ActiveChartProvider({ children }: { children: React.ReactNode }) {
  const snapshotRef = useRef<ActiveChartSnapshot | null>(null);
  const commandRefsRef = useRef<ActiveChartCommandRefs | null>(null);
  const readStateRef = useRef<ActiveChartReadState | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const notifyRafRef = useRef<number | null>(null);
  const [, bump] = useState(0);

  const flushNotify = useCallback(() => {
    notifyRafRef.current = null;
    listenersRef.current.forEach((listener) => listener());
    bump((n) => n + 1);
  }, []);

  const scheduleNotify = useCallback(() => {
    if (notifyRafRef.current != null) return;
    notifyRafRef.current = requestAnimationFrame(flushNotify);
  }, [flushNotify]);

  const notifyNow = useCallback(() => {
    if (notifyRafRef.current != null) {
      cancelAnimationFrame(notifyRafRef.current);
      notifyRafRef.current = null;
    }
    flushNotify();
  }, [flushNotify]);

  const register = useCallback(
    (chartId: string, payload: ActiveChartRegistration) => {
      const nextSnapshot = buildSnapshot(chartId, payload);
      const prevSnapshot = snapshotRef.current;
      const prevCommands = commandRefsRef.current;
      const prevReadState = readStateRef.current;

      const nextCommands: ActiveChartCommandRefs = {
        chartCommands: payload.chartCommands,
        drawingCommands: payload.drawingCommands,
        drawingToolbarActions: payload.drawingToolbarActions,
        overlayActions: payload.overlayActions,
        dataWindowActions: payload.dataWindowActions,
        uiCommands: payload.uiCommands,
        headerActions: payload.headerActions,
        onConfigChange: payload.onConfigChange,
        openIndicatorPicker: payload.openIndicatorPicker,
      };

      const nextReadState: ActiveChartReadState = {
        chartId,
        ...payload.readState,
      };

      snapshotRef.current = nextSnapshot;
      commandRefsRef.current = nextCommands;
      readStateRef.current = nextReadState;

      if (snapshotUnchanged(prevSnapshot, nextSnapshot)) {
        return;
      }

      const commandsChanged = !commandRefsEqual(prevCommands, nextCommands);
      const readChanged = readStateNeedsNotify(prevReadState, nextReadState);
      const dataWindowOnly =
        !commandsChanged &&
        !readChanged &&
        prevReadState != null &&
        !dataWindowEqual(prevReadState.dataWindow, nextReadState.dataWindow);

      if (dataWindowOnly) {
        return;
      }

      if (commandsChanged || readChanged) {
        notifyNow();
        return;
      }

      scheduleNotify();
    },
    [notifyNow, scheduleNotify],
  );

  const unregister = useCallback(
    (chartId: string) => {
      if (snapshotRef.current?.chartId !== chartId) return;
      snapshotRef.current = null;
      commandRefsRef.current = null;
      readStateRef.current = null;
      notifyNow();
    },
    [notifyNow],
  );

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ register, unregister, getSnapshot, subscribe }),
    [register, unregister, getSnapshot, subscribe],
  );

  return (
    <ActiveChartContext.Provider value={value}>
      {children}
    </ActiveChartContext.Provider>
  );
}

export function useActiveChart(): ActiveChartSnapshot | null {
  const ctx = useContext(ActiveChartContext);
  if (!ctx) return null;

  return useSyncExternalStore(ctx.subscribe, ctx.getSnapshot, () => null);
}

export function useActiveChartBridge(): ActiveChartContextValue | null {
  return useContext(ActiveChartContext);
}
