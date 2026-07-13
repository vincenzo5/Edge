/** Shared breakpoints and layout dimensions for responsive shell behavior. */
export const RESPONSIVE_BREAKPOINTS = {
  phone: 640,
  tablet: 1024,
  desktop: 1280,
} as const;

/** Screener docked panel may use up to 90% of viewport minus rail, capped here. */
export const SCREENER_SIDEBAR_WIDTH_MAX_CAP = 1400;
export const SCREENER_SIDEBAR_WIDTH_VIEWPORT_RATIO = 0.9;
/** Below this width the screener stacks presets as horizontal chips instead of a left column. */
export const SCREENER_NARROW_LAYOUT_THRESHOLD = 520;

export const LAYOUT_DIMENSIONS = {
  sidebarPanelWidth: 300,
  sidebarPanelWidthMin: 260,
  sidebarPanelWidthMax: 560,
  /** TradingView-style slim icon rails (left drawing toolbar + right sidebar). */
  sidebarRailWidth: 44,
  compactSidebarRailWidth: 40,
  /** Minimum width for a single chart cell container to remain usable. */
  minUsableChartWidth: 320,
  /** Minimum height for a single chart cell container to remain usable. */
  minUsableChartHeight: 240,
  /** Header toolbar width thresholds for density modes. */
  headerFullWidth: 1100,
  headerCompactWidth: 768,
} as const;
