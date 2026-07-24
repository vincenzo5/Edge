import type { CommandCatalogEntry, ShortcutId } from "./shortcutTypes";

export const COMMAND_CATALOG: Record<ShortcutId, CommandCatalogEntry> = {
  openCommandPalette: {
    id: "openCommandPalette",
    label: "Open command palette",
    category: "navigation",
    keywords: ["commands", "search", "palette", "cmd k"],
  },
  changeSymbol: {
    id: "changeSymbol",
    label: "Change symbol…",
    category: "navigation",
    keywords: ["symbol", "ticker", "search", "load"],
  },
  openIndicators: {
    id: "openIndicators",
    label: "Indicators…",
    category: "chart",
    keywords: ["indicator", "study", "add"],
  },
  toggleTheme: {
    id: "toggleTheme",
    label: "Toggle theme",
    category: "view",
    keywords: ["dark", "light", "mode"],
  },
  toggleAccount: {
    id: "toggleAccount",
    label: "Toggle account panel",
    category: "panels",
    keywords: ["account", "broker", "positions"],
  },
  toggleSettings: {
    id: "toggleSettings",
    label: "Toggle settings panel",
    category: "panels",
    keywords: ["settings", "risk", "preferences"],
  },
  toggleOptions: {
    id: "toggleOptions",
    label: "Toggle options panel",
    category: "panels",
    keywords: ["options", "chain"],
  },
  toggleScreenerPanel: {
    id: "toggleScreenerPanel",
    label: "Toggle screener panel",
    category: "panels",
    keywords: ["screener", "scan", "filter"],
  },
  toggleTradePanel: {
    id: "toggleTradePanel",
    label: "Toggle trade panel",
    category: "panels",
    keywords: ["trade", "order", "ticket"],
  },
  togglePatternsPanel: {
    id: "togglePatternsPanel",
    label: "Toggle patterns panel",
    category: "panels",
    keywords: ["patterns", "library", "similar"],
  },
  undo: {
    id: "undo",
    label: "Undo",
    category: "drawings",
    keywords: ["revert"],
  },
  redo: {
    id: "redo",
    label: "Redo",
    category: "drawings",
    keywords: ["repeat"],
  },
  copyDrawing: {
    id: "copyDrawing",
    label: "Copy drawing",
    category: "drawings",
    keywords: ["clipboard"],
  },
  pasteDrawing: {
    id: "pasteDrawing",
    label: "Paste drawing",
    category: "drawings",
    keywords: ["clipboard"],
  },
  deleteDrawing: {
    id: "deleteDrawing",
    label: "Delete drawing",
    category: "drawings",
    keywords: ["remove", "backspace"],
  },
  duplicateDrawing: {
    id: "duplicateDrawing",
    label: "Duplicate drawing",
    category: "drawings",
    keywords: ["clone"],
  },
  renameDrawing: {
    id: "renameDrawing",
    label: "Rename drawing",
    category: "drawings",
    keywords: ["label", "f2"],
  },
  lockDrawing: {
    id: "lockDrawing",
    label: "Lock drawing",
    category: "drawings",
    keywords: ["unlock"],
  },
  goToDate: {
    id: "goToDate",
    label: "Go to date…",
    category: "chart",
    keywords: ["jump", "navigate", "calendar"],
  },
  resetChartView: {
    id: "resetChartView",
    label: "Reset chart view",
    category: "chart",
    keywords: ["zoom", "fit", "default"],
  },
  snapshotDownload: {
    id: "snapshotDownload",
    label: "Download snapshot",
    category: "capture",
    keywords: ["screenshot", "image", "export"],
  },
  snapshotCopy: {
    id: "snapshotCopy",
    label: "Copy snapshot",
    category: "capture",
    keywords: ["screenshot", "clipboard"],
  },
  fullscreen: {
    id: "fullscreen",
    label: "Toggle fullscreen",
    category: "view",
    keywords: ["expand", "maximize"],
  },
  toggleObjectTree: {
    id: "toggleObjectTree",
    label: "Toggle object tree",
    category: "panels",
    keywords: ["layers", "indicators", "drawings"],
  },
  toggleWatchlist: {
    id: "toggleWatchlist",
    label: "Toggle watchlist",
    category: "panels",
    keywords: ["symbols", "list"],
  },
  toggleCopilot: {
    id: "toggleCopilot",
    label: "Toggle copilot",
    category: "panels",
    keywords: ["ai", "chat", "assistant", "agent"],
  },
  openPositions: {
    id: "openPositions",
    label: "Open positions",
    category: "panels",
    keywords: ["risk", "positions", "open", "trades", "account"],
  },
  toggleLinkedLayout: {
    id: "toggleLinkedLayout",
    label: "Toggle linked layout",
    category: "layout",
    keywords: ["sync", "link", "symbol", "interval"],
  },
  activateCell1: {
    id: "activateCell1",
    label: "Focus chart 1",
    category: "layout",
    keywords: ["cell", "pane"],
  },
  activateCell2: {
    id: "activateCell2",
    label: "Focus chart 2",
    category: "layout",
    keywords: ["cell", "pane"],
  },
  activateCell3: {
    id: "activateCell3",
    label: "Focus chart 3",
    category: "layout",
    keywords: ["cell", "pane"],
  },
  activateCell4: {
    id: "activateCell4",
    label: "Focus chart 4",
    category: "layout",
    keywords: ["cell", "pane"],
  },
  invertScale: {
    id: "invertScale",
    label: "Invert price scale",
    category: "chart",
    keywords: ["flip", "scale"],
  },
  patternCaptureToggle: {
    id: "patternCaptureToggle",
    label: "Toggle pattern capture",
    category: "capture",
    keywords: ["pattern", "library"],
  },
  patternCaptureUndo: {
    id: "patternCaptureUndo",
    label: "Undo pattern section",
    category: "capture",
    keywords: ["pattern"],
  },
  patternCaptureSave: {
    id: "patternCaptureSave",
    label: "Save pattern capture",
    category: "capture",
    keywords: ["pattern", "library"],
  },
};

export function getCommandLabel(id: ShortcutId): string {
  return COMMAND_CATALOG[id]?.label ?? id;
}

export function getCommandCategory(id: ShortcutId): CommandCatalogEntry["category"] {
  return COMMAND_CATALOG[id]?.category ?? "navigation";
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function commandSearchText(entry: CommandCatalogEntry): string {
  return [entry.label, entry.category, ...(entry.keywords ?? [])].join(" ").toLowerCase();
}

/** Simple substring fuzzy match — all query tokens must appear in search text. */
export function filterCommandsByQuery(
  ids: ShortcutId[],
  query: string,
): ShortcutId[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return ids;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return ids.filter((id) => {
    const text = commandSearchText(COMMAND_CATALOG[id]);
    return tokens.every((token) => text.includes(token));
  });
}

export function allCatalogCommandIds(): ShortcutId[] {
  return Object.keys(COMMAND_CATALOG) as ShortcutId[];
}
