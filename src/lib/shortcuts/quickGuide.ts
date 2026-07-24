import type { ShortcutId } from "./shortcutTypes";

export type QuickGuideGroup = {
  id: string;
  label: string;
  commandIds: ShortcutId[];
};

/** Curated common commands shown in the palette empty state. */
export const QUICK_GUIDE_GROUPS: QuickGuideGroup[] = [
  {
    id: "navigation",
    label: "Navigation",
    commandIds: ["changeSymbol", "openCommandPalette"],
  },
  {
    id: "chart",
    label: "Chart",
    commandIds: ["openIndicators", "goToDate", "resetChartView"],
  },
  {
    id: "drawings",
    label: "Drawings",
    commandIds: ["undo", "redo", "deleteDrawing", "copyDrawing", "pasteDrawing"],
  },
  {
    id: "panels",
    label: "Panels",
    commandIds: [
      "toggleWatchlist",
      "toggleCopilot",
      "toggleObjectTree",
      "toggleAccount",
      "toggleTradePanel",
      "toggleSettings",
    ],
  },
  {
    id: "view",
    label: "View",
    commandIds: ["fullscreen", "toggleTheme", "toggleLinkedLayout"],
  },
];

export function quickGuideCommandIds(): ShortcutId[] {
  const seen = new Set<ShortcutId>();
  const ids: ShortcutId[] = [];
  for (const group of QUICK_GUIDE_GROUPS) {
    for (const id of group.commandIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
