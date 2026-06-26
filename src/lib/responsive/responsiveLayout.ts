import type { GridMode } from '@/lib/chartConfig';
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

/** Whether a two-column grid should stack into a single column. */
export function shouldStackGridColumns(
  gridMode: GridMode,
  availableWidth: number,
): boolean {
  const columnCount = gridMode === '1x2' || gridMode === '2x2' ? 2 : 1;
  if (columnCount === 1) return false;
  const minWidth = LAYOUT_DIMENSIONS.minUsableChartWidth * columnCount;
  return availableWidth < minWidth;
}

/** CSS grid classes for the requested mode and available container width. */
export function resolveGridContainerClass(
  gridMode: GridMode,
  availableWidth: number,
): string {
  if (shouldStackGridColumns(gridMode, availableWidth)) {
    switch (gridMode) {
      case '1x2':
        return 'grid-cols-1 chart-grid-rows-2';
      case '2x2':
        return 'grid-cols-1 chart-grid-rows-4';
      default:
        break;
    }
  }

  switch (gridMode) {
    case '1x1':
      return 'grid-cols-1 chart-grid-rows-1';
    case '2x1':
      return 'grid-cols-1 chart-grid-rows-2';
    case '1x2':
      return 'grid-cols-2 chart-grid-rows-1';
    case '3x1':
      return 'grid-cols-1 chart-grid-rows-3';
    case '2x2':
      return 'grid-cols-2 chart-grid-rows-2';
  }
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
