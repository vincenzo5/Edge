import type { ChartLayout } from "./chartConfig";
import {
  migrateChartLayout,
  mergeChartSettings,
  migrateCellIndicators,
  coerceTheme,
  DEFAULT_LAYOUT,
  DEFAULT_CELL,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  type LegacySidebarPanelId,
  type SidebarPanelId,
  type SidebarPrefs,
  type FloatingPanelGeometry,
} from "./chartConfig";
import { migrateSidebarWidth } from "./responsive/sidebarWidth";
import {
  normalizeFloatingGeometry,
  normalizePanelPresentation,
} from "./sidebar/floatingPanelGeometry";

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
    const sync = migrateChartLayout({ ...parsed, version: 1, cells } as ChartLayout);
    return {
      ...sync,
      theme: coerceTheme(parsed.theme),
      activeCellIndex:
        typeof parsed.activeCellIndex === "number" && parsed.activeCellIndex >= 0
          ? parsed.activeCellIndex
          : 0,
      toolbarPrefs: {
        ...DEFAULT_TOOLBAR_PREFS,
        ...parsed.toolbarPrefs,
        groupSelections: parsed.toolbarPrefs?.groupSelections,
      },
      sidebar: normalizeSidebarPrefs(parsed.sidebar),
      cells,
    };
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

const VALID_SIDEBAR_PANELS = new Set<SidebarPanelId>([
  "object-tree",
  "watchlist",
  "account",
  "settings",
  "options",
  "screener",
  "trade",
  "patterns",
]);

function migrateLegacySidebarPanelId(
  value: LegacySidebarPanelId | null | undefined,
): SidebarPanelId | null {
  if (value == null) return null;
  if (value === "risk") return "settings";
  return isSidebarPanelId(value) ? value : DEFAULT_SIDEBAR_PREFS.activePanel;
}

function isSidebarPanelId(value: unknown): value is SidebarPanelId {
  return typeof value === "string" && VALID_SIDEBAR_PANELS.has(value as SidebarPanelId);
}

type ParsedSidebarPrefs = SidebarPrefs & {
  panelWidths?: Partial<Record<LegacySidebarPanelId, number>>;
};

function normalizeSidebarPrefs(sidebar: ParsedSidebarPrefs | undefined): SidebarPrefs {
  const rawActive = sidebar?.activePanel as LegacySidebarPanelId | null | undefined;
  const activePanel = migrateLegacySidebarPanelId(rawActive);
  const width = migrateSidebarWidth(sidebar);
  const presentation = normalizePresentationMap(sidebar?.presentation);
  const floatingGeometry = normalizeFloatingGeometryMap(sidebar?.floatingGeometry);
  return {
    activePanel,
    ...(width != null ? { width } : {}),
    ...(presentation ? { presentation } : {}),
    ...(floatingGeometry ? { floatingGeometry } : {}),
  };
}

function normalizePresentationMap(
  value: Partial<Record<SidebarPanelId, unknown>> | undefined,
): SidebarPrefs["presentation"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: NonNullable<SidebarPrefs["presentation"]> = {};
  for (const panelId of VALID_SIDEBAR_PANELS) {
    const presentation = normalizePanelPresentation(value[panelId]);
    if (presentation) result[panelId] = presentation;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeFloatingGeometryMap(
  value: Partial<Record<SidebarPanelId, FloatingPanelGeometry>> | undefined,
): SidebarPrefs["floatingGeometry"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: NonNullable<SidebarPrefs["floatingGeometry"]> = {};
  for (const panelId of VALID_SIDEBAR_PANELS) {
    const geometry = normalizeFloatingGeometry(panelId, value[panelId]);
    if (geometry) result[panelId] = geometry;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function clearLayout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
