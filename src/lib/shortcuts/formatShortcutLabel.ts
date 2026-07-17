import type { KeyBinding, ShortcutId } from "./shortcutTypes";

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function formatBinding(binding: KeyBinding): string {
  const mac = isMacPlatform();
  const parts: string[] = [];

  if (binding.alt) parts.push(mac ? "⌥" : "Alt");
  if (binding.mod) parts.push(mac ? "⌘" : "Ctrl");
  if (binding.shift) parts.push(mac ? "⇧" : "Shift");

  const keyLabel = formatKey(binding.key, mac);
  parts.push(keyLabel);

  return parts.join(mac ? " " : "+");
}

function formatKey(key: string, mac: boolean): string {
  switch (key.toLowerCase()) {
    case "backspace":
      return mac ? "⌫" : "Backspace";
    case "delete":
      return mac ? "⌦" : "Delete";
    case "escape":
      return "Esc";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

/** Static key bindings used for display labels across the app. */
export const SHORTCUT_BINDINGS: Record<ShortcutId, KeyBinding[]> = {
  quickSearch: [{ mod: true, key: "k" }],
  undo: [{ mod: true, key: "z" }],
  redo: [{ mod: true, shift: true, key: "z" }],
  copyDrawing: [{ mod: true, key: "c" }],
  pasteDrawing: [{ mod: true, key: "v" }],
  deleteDrawing: [{ key: "backspace" }, { key: "delete" }],
  duplicateDrawing: [{ mod: true, key: "d" }],
  renameDrawing: [{ key: "f2" }],
  lockDrawing: [{ alt: true, key: "l" }],
  goToDate: [{ alt: true, key: "g" }],
  resetChartView: [{ alt: true, key: "r" }],
  snapshotDownload: [{ mod: true, alt: true, key: "s" }],
  snapshotCopy: [{ mod: true, shift: true, key: "s" }],
  fullscreen: [{ shift: true, key: "f" }],
  toggleObjectTree: [{ alt: true, key: "o" }],
  toggleWatchlist: [{ alt: true, key: "w" }],
  toggleLinkedLayout: [{ alt: true, key: "l" }],
  activateCell1: [{ alt: true, key: "1" }],
  activateCell2: [{ alt: true, key: "2" }],
  activateCell3: [{ alt: true, key: "3" }],
  activateCell4: [{ alt: true, key: "4" }],
  invertScale: [{ alt: true, key: "i" }],
  patternCaptureToggle: [{ shift: true, key: "p" }],
  patternCaptureUndo: [{ key: "backspace" }],
  patternCaptureSave: [{ mod: true, key: "Enter" }],
};

export function getShortcutLabel(id: ShortcutId): string {
  const bindings = SHORTCUT_BINDINGS[id];
  if (!bindings?.length) return "";
  return bindings.map(formatBinding).join(" / ");
}

export function formatKeyBinding(binding: KeyBinding): string {
  return formatBinding(binding);
}
