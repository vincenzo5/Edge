/** Shared breakpoints and layout dimensions for responsive shell behavior. */
export const RESPONSIVE_BREAKPOINTS = {
  phone: 640,
  tablet: 1024,
  desktop: 1280,
} as const;

export const LAYOUT_DIMENSIONS = {
  sidebarPanelWidth: 300,
  sidebarRailWidth: 60,
  compactSidebarRailWidth: 48,
  /** Minimum width for a single chart cell container to remain usable. */
  minUsableChartWidth: 320,
  /** Minimum height for a single chart cell container to remain usable. */
  minUsableChartHeight: 240,
  /** Header toolbar width thresholds for density modes. */
  headerFullWidth: 1100,
  headerCompactWidth: 768,
} as const;
