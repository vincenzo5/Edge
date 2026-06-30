import type { LegacySidebarPanelId, SidebarPanelId } from "@/lib/chartConfig";
import { LAYOUT_DIMENSIONS } from "./layoutConstants";

const SIDEBAR_PANEL_IDS: SidebarPanelId[] = ["object-tree", "watchlist"];

const LEGACY_PANEL_WIDTH_KEYS: LegacySidebarPanelId[] = [
  "object-tree",
  "watchlist",
  "options",
];

export function clampSidebarPanelWidth(width: number): number {
  return Math.min(
    LAYOUT_DIMENSIONS.sidebarPanelWidthMax,
    Math.max(LAYOUT_DIMENSIONS.sidebarPanelWidthMin, Math.round(width)),
  );
}

export function resolveSidebarPanelWidth(width: number | undefined): number {
  if (typeof width !== "number" || !Number.isFinite(width)) {
    return LAYOUT_DIMENSIONS.sidebarPanelWidth;
  }
  return clampSidebarPanelWidth(width);
}

type LegacySidebarPrefs = {
  activePanel?: LegacySidebarPanelId | null;
  width?: number;
  panelWidths?: Partial<Record<LegacySidebarPanelId, number>>;
};

/** Migrate legacy per-panel widths to one shared sidebar width. */
export function migrateSidebarWidth(
  sidebar: LegacySidebarPrefs | undefined,
): number | undefined {
  if (!sidebar) return undefined;

  if (typeof sidebar.width === "number" && Number.isFinite(sidebar.width)) {
    return clampSidebarPanelWidth(sidebar.width);
  }

  const legacy = sidebar.panelWidths;
  if (!legacy || typeof legacy !== "object") return undefined;

  const activePanel = sidebar.activePanel;
  if (activePanel === "options") {
    const optionsWidth = legacy.options;
    if (typeof optionsWidth === "number" && Number.isFinite(optionsWidth)) {
      return clampSidebarPanelWidth(optionsWidth);
    }
  }
  if (
    activePanel &&
    typeof legacy[activePanel] === "number" &&
    Number.isFinite(legacy[activePanel])
  ) {
    return clampSidebarPanelWidth(legacy[activePanel]!);
  }

  for (const panelId of LEGACY_PANEL_WIDTH_KEYS) {
    const stored = legacy[panelId];
    if (typeof stored === "number" && Number.isFinite(stored)) {
      return clampSidebarPanelWidth(stored);
    }
  }

  for (const panelId of SIDEBAR_PANEL_IDS) {
    const stored = legacy[panelId];
    if (typeof stored === "number" && Number.isFinite(stored)) {
      return clampSidebarPanelWidth(stored);
    }
  }

  return undefined;
}
