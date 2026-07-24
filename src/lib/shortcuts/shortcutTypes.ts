export type ShortcutScope = "app" | "chart" | "drawing" | "modal";

export type ShortcutId =
  | "openCommandPalette"
  | "changeSymbol"
  | "openIndicators"
  | "toggleTheme"
  | "toggleAccount"
  | "toggleSettings"
  | "toggleOptions"
  | "toggleScreenerPanel"
  | "toggleTradePanel"
  | "togglePatternsPanel"
  | "undo"
  | "redo"
  | "copyDrawing"
  | "pasteDrawing"
  | "deleteDrawing"
  | "duplicateDrawing"
  | "renameDrawing"
  | "lockDrawing"
  | "goToDate"
  | "resetChartView"
  | "snapshotDownload"
  | "snapshotCopy"
  | "fullscreen"
  | "toggleObjectTree"
  | "toggleWatchlist"
  | "toggleCopilot"
  | "openPositions"
  | "toggleLinkedLayout"
  | "activateCell1"
  | "activateCell2"
  | "activateCell3"
  | "activateCell4"
  | "invertScale"
  | "patternCaptureToggle"
  | "patternCaptureUndo"
  | "patternCaptureSave";

export type CommandCategory =
  | "navigation"
  | "chart"
  | "drawings"
  | "panels"
  | "layout"
  | "view"
  | "capture";

export type KeyBinding = {
  /** Primary modifier: Meta on macOS, Ctrl elsewhere */
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
  key: string;
};

export type ShortcutCommand = {
  id: ShortcutId;
  scope: ShortcutScope;
  keys: KeyBinding[];
  enabled?: () => boolean;
  run: () => void | Promise<void>;
};

export type NormalizedShortcut = {
  mod: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
};

export type CommandCatalogEntry = {
  id: ShortcutId;
  label: string;
  category: CommandCategory;
  keywords?: string[];
};
