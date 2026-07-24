import type { CellConfig, Theme, TrackedOverlay, SerializedDrawing } from "@/lib/chartConfig";
import type { Candle, DrawingStyles } from "@edge/chart-core/contracts";
import type { ChartDataMeta } from "@edge/chart-core";
import type { GoToRequest, GoToResult } from "@edge/chart-react/engine/goTo";
import type { SnapshotAction, SnapshotCaptureOptions } from "@/lib/chart/chartSnapshot";
import type { DataWindowProps } from "@/lib/chart/dataWindow";

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
  togglePatternCapture: () => void;
  undoPatternCapture: () => void;
  savePatternCapture: () => void;
  cancelPatternCapture: () => void;
  isPatternCaptureActive: () => boolean;
  canSavePatternCapture: () => boolean;
};

export type ActiveChartDrawingToolbarState = {
  activeTool: string;
  allLocked: boolean;
  allHidden: boolean;
  hasSelection: boolean;
  patternCaptureActive?: boolean;
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

export type { DataWindowProps };
