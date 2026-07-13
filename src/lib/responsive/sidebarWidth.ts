import type { LegacySidebarPanelId, SidebarPanelId } from "@/lib/chartConfig";
import {
  LAYOUT_DIMENSIONS,
  SCREENER_SIDEBAR_WIDTH_MAX_CAP,
  SCREENER_SIDEBAR_WIDTH_VIEWPORT_RATIO,
} from "./layoutConstants";

const SIDEBAR_PANEL_IDS: SidebarPanelId[] = [
  "object-tree",
  "watchlist",
  "options",
  "screener",
  "account",
  "settings",
];

const LEGACY_PANEL_WIDTH_KEYS: LegacySidebarPanelId[] = [
  "object-tree",
  "watchlist",
  "options",
  "screener",
  "settings",
  "account",
  "risk",
];

export function resolveScreenerSidebarPanelMax(
  viewportWidth: number,
  railWidth: number = LAYOUT_DIMENSIONS.sidebarRailWidth,
): number {
  const available = viewportWidth - railWidth;
  const ratioWidth = Math.round(SCREENER_SIDEBAR_WIDTH_VIEWPORT_RATIO * available);
  return Math.min(
    SCREENER_SIDEBAR_WIDTH_MAX_CAP,
    Math.max(LAYOUT_DIMENSIONS.sidebarPanelWidthMin, ratioWidth),
  );
}

export function resolveSidebarPanelMaxWidth(
  activePanel: SidebarPanelId | null | undefined,
  viewportWidth?: number,
  railWidth: number = LAYOUT_DIMENSIONS.sidebarRailWidth,
): number {
  if (activePanel === "screener" && typeof viewportWidth === "number" && Number.isFinite(viewportWidth)) {
    return resolveScreenerSidebarPanelMax(viewportWidth, railWidth);
  }
  return LAYOUT_DIMENSIONS.sidebarPanelWidthMax;
}

export function clampSidebarPanelWidth(
  width: number,
  activePanel?: SidebarPanelId | null,
  viewportWidth?: number,
  railWidth?: number,
): number {
  const max = resolveSidebarPanelMaxWidth(activePanel, viewportWidth, railWidth);
  return Math.min(max, Math.max(LAYOUT_DIMENSIONS.sidebarPanelWidthMin, Math.round(width)));
}

/** When leaving screener, clamp a wide stored width back to the default panel max. */
export function clampSidebarWidthOnPanelLeave(width: number): number {
  if (width > LAYOUT_DIMENSIONS.sidebarPanelWidthMax) {
    return LAYOUT_DIMENSIONS.sidebarPanelWidthMax;
  }
  return clampSidebarPanelWidth(width);
}

export function computeScreenerExpandedSidebarWidth(
  viewportWidth: number,
  railWidth: number = LAYOUT_DIMENSIONS.sidebarRailWidth,
): number {
  return clampSidebarPanelWidth(
    viewportWidth - railWidth,
    "screener",
    viewportWidth,
    railWidth,
  );
}

export function resolveSidebarPanelWidth(
  width: number | undefined,
  activePanel?: SidebarPanelId | null,
  viewportWidth?: number,
  railWidth?: number,
): number {
  if (typeof width !== "number" || !Number.isFinite(width)) {
    return LAYOUT_DIMENSIONS.sidebarPanelWidth;
  }
  return clampSidebarPanelWidth(width, activePanel, viewportWidth, railWidth);
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
    return clampSidebarWidthOnPanelLeave(sidebar.width);
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
