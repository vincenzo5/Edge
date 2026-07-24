/**
 * Right padding (px) for the chart grid when a docked overlay panel is open.
 * Keeps candles/price axis clear of the panel without switching to inline reflow.
 */
export function chartOverlayRightInsetPx(options: {
  activePanel: string | null;
  isFloating: boolean;
  panelWidth: number;
}): number {
  if (options.activePanel == null || options.isFloating) return 0;
  return Math.max(0, Math.round(options.panelWidth));
}
