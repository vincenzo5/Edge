import type { ChartLayout } from "./chartConfig";
import { DEFAULT_LAYOUT, DEFAULT_CELL } from "./chartConfig";

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
    const cells = parsed.cells.map((c) => ({
      ...DEFAULT_CELL,
      ...c,
      drawings: Array.isArray(c.drawings) ? c.drawings : [],
      paneOrder: Array.isArray(c.paneOrder) ? c.paneOrder : undefined,
      collapsedPanes: Array.isArray(c.collapsedPanes) ? c.collapsedPanes : undefined,
      maximizedPane: c.maximizedPane ?? null,
    }));
    return { ...DEFAULT_LAYOUT, ...parsed, cells } as ChartLayout;
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

export function clearLayout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
