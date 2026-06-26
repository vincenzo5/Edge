import type { SidebarPanelId } from "@/lib/chartConfig";
import { LAYOUT_DIMENSIONS } from "./layoutConstants";

export function clampSidebarPanelWidth(width: number): number {
  return Math.min(
    LAYOUT_DIMENSIONS.sidebarPanelWidthMax,
    Math.max(LAYOUT_DIMENSIONS.sidebarPanelWidthMin, Math.round(width)),
  );
}

export function resolveSidebarPanelWidth(
  panelId: SidebarPanelId | null,
  panelWidths: Partial<Record<SidebarPanelId, number>> | undefined,
): number {
  if (!panelId) return LAYOUT_DIMENSIONS.sidebarPanelWidth;
  const stored = panelWidths?.[panelId];
  if (typeof stored !== "number" || !Number.isFinite(stored)) {
    return LAYOUT_DIMENSIONS.sidebarPanelWidth;
  }
  return clampSidebarPanelWidth(stored);
}
