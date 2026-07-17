export type ShortcutScope = "app" | "chart" | "drawing" | "modal";

export type ShortcutId =
  | "quickSearch"
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
  | "toggleLinkedLayout"
  | "activateCell1"
  | "activateCell2"
  | "activateCell3"
  | "activateCell4"
  | "invertScale"
  | "patternCaptureToggle"
  | "patternCaptureUndo"
  | "patternCaptureSave";

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
