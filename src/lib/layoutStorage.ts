import type { ChartLayout } from "./chartConfig";
import {
  DEFAULT_LAYOUT,
  DEFAULT_CELL,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  mergeChartSettings,
  migrateCellIndicators,
  type SidebarPanelId,
} from "./chartConfig";

const STORAGE_KEY = "tv-ai:layout:v1";

export function loadLayout(): ChartLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<ChartLayout>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cells) || parsed.cells.length === 0) {
      return DEFAULT_LAYOUT;
    }
    // Migrate cells missing the drawings field (added in a later version).
    // Also ensure pane layout fields (paneOrder, collapsedPanes, maximizedPane) are present.
    const cells = parsed.cells.map((c) =>
      migrateCellIndicators({
        ...DEFAULT_CELL,
        ...c,
        drawings: Array.isArray(c.drawings) ? c.drawings : [],
        paneOrder: Array.isArray(c.paneOrder) ? c.paneOrder : undefined,
        collapsedPanes: Array.isArray(c.collapsedPanes) ? c.collapsedPanes : undefined,
        maximizedPane: c.maximizedPane ?? null,
        chartSettings: mergeChartSettings(c.chartSettings),
      }),
    );
    return {
      ...DEFAULT_LAYOUT,
      ...parsed,
      activeCellIndex:
        typeof parsed.activeCellIndex === "number" && parsed.activeCellIndex >= 0
          ? parsed.activeCellIndex
          : 0,
      toolbarPrefs: {
        ...DEFAULT_TOOLBAR_PREFS,
        ...parsed.toolbarPrefs,
        groupSelections: parsed.toolbarPrefs?.groupSelections,
      },
      sidebar: {
        ...DEFAULT_SIDEBAR_PREFS,
        activePanel: isSidebarPanelId(parsed.sidebar?.activePanel)
          ? parsed.sidebar!.activePanel
          : DEFAULT_SIDEBAR_PREFS.activePanel,
      },
      cells,
    } as ChartLayout;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: ChartLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage may be full or disabled; ignore.
  }
}

const VALID_SIDEBAR_PANELS = new Set<SidebarPanelId>(["object-tree"]);

function isSidebarPanelId(value: unknown): value is SidebarPanelId {
  return typeof value === "string" && VALID_SIDEBAR_PANELS.has(value as SidebarPanelId);
}

export function clearLayout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
