import type {
  FloatingPanelGeometry,
  PanelPresentation,
  SidebarPanelId,
  SidebarPrefs,
} from "@/lib/chartConfig";

export const FLOATING_PANEL_MIN_WIDTH = 480;
export const FLOATING_PANEL_MIN_HEIGHT = 320;
export const FLOATING_PANEL_MARGIN = 8;

export const FLOATING_PANEL_DEFAULTS: Record<
  SidebarPanelId,
  { width: number; height: number; x: number; y: number }
> = {
  watchlist: { width: 480, height: 400, x: 48, y: 48 },
  options: { width: 920, height: 560, x: 48, y: 48 },
  screener: { width: 960, height: 600, x: 40, y: 40 },
  "object-tree": { width: 480, height: 400, x: 48, y: 48 },
  account: { width: 480, height: 400, x: 48, y: 48 },
  settings: { width: 480, height: 400, x: 48, y: 48 },
  trade: { width: 400, height: 520, x: 48, y: 48 },
};

export function getPanelPresentation(
  sidebar: SidebarPrefs | undefined,
  panelId: SidebarPanelId,
): PanelPresentation {
  return sidebar?.presentation?.[panelId] ?? "docked";
}

export function defaultFloatingGeometry(panelId: SidebarPanelId): FloatingPanelGeometry {
  const defaults = FLOATING_PANEL_DEFAULTS[panelId];
  return {
    x: defaults.x,
    y: defaults.y,
    width: defaults.width,
    height: defaults.height,
  };
}

export function clampFloatingGeometry(
  geometry: FloatingPanelGeometry,
  containerWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  containerHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): FloatingPanelGeometry {
  const margin = FLOATING_PANEL_MARGIN;
  const width = Math.max(
    FLOATING_PANEL_MIN_WIDTH,
    Math.min(geometry.width, containerWidth - margin * 2),
  );
  const height = Math.max(
    FLOATING_PANEL_MIN_HEIGHT,
    Math.min(geometry.height, containerHeight - margin * 2),
  );
  const x = Math.max(margin, Math.min(geometry.x, containerWidth - width - margin));
  const y = Math.max(margin, Math.min(geometry.y, containerHeight - height - margin));
  return { x, y, width, height };
}

export function normalizeFloatingGeometry(
  panelId: SidebarPanelId,
  geometry: FloatingPanelGeometry | undefined,
): FloatingPanelGeometry | undefined {
  if (!geometry) return undefined;
  if (
    !Number.isFinite(geometry.x) ||
    !Number.isFinite(geometry.y) ||
    !Number.isFinite(geometry.width) ||
    !Number.isFinite(geometry.height)
  ) {
    return undefined;
  }
  return clampFloatingGeometry(geometry);
}

export function normalizePanelPresentation(
  value: unknown,
): PanelPresentation | undefined {
  if (value === "docked" || value === "floating") return value;
  return undefined;
}
