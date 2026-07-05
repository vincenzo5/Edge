import type { LayoutTemplate } from '@/lib/chart/layoutTemplates';
import { LAYOUT_DIMENSIONS, RESPONSIVE_BREAKPOINTS } from './layoutConstants';

export type SidebarMode = 'inline' | 'overlay';
export type RailMode = 'full' | 'compact';
export type HeaderDensity = 'full' | 'compact' | 'minimal';
export type ViewportTier = 'phone' | 'tablet' | 'desktop';

export function resolveViewportTier(viewportWidth: number): ViewportTier {
  if (viewportWidth < RESPONSIVE_BREAKPOINTS.phone) return 'phone';
  if (viewportWidth < RESPONSIVE_BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export function resolveSidebarMode(viewportWidth: number): SidebarMode {
  return viewportWidth >= RESPONSIVE_BREAKPOINTS.tablet ? 'inline' : 'overlay';
}

export function resolveRailMode(viewportWidth: number): RailMode {
  return viewportWidth < RESPONSIVE_BREAKPOINTS.phone ? 'compact' : 'full';
}

export function resolveHeaderDensity(availableWidth: number): HeaderDensity {
  if (availableWidth >= LAYOUT_DIMENSIONS.headerFullWidth) return 'full';
  if (availableWidth >= LAYOUT_DIMENSIONS.headerCompactWidth) return 'compact';
  return 'minimal';
}

/** Whether a multi-column layout should stack into a single column. */
export function shouldStackLayout(
  template: LayoutTemplate,
  availableWidth: number,
): boolean {
  if (template.columns <= 1) return false;
  const minWidth = LAYOUT_DIMENSIONS.minUsableChartWidth * template.columns;
  return availableWidth < minWidth;
}
export function chartAreaWidthForViewport(
  viewportWidth: number,
  sidebarMode: SidebarMode,
  railMode: RailMode,
  sidebarPanelWidth: number = LAYOUT_DIMENSIONS.sidebarPanelWidth,
): number {
  const railWidth =
    railMode === 'compact'
      ? LAYOUT_DIMENSIONS.compactSidebarRailWidth
      : LAYOUT_DIMENSIONS.sidebarRailWidth;
  const sidebarWidth = sidebarMode === 'inline' ? sidebarPanelWidth : 0;
  return Math.max(0, viewportWidth - railWidth - sidebarWidth);
}
