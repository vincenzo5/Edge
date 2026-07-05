export type HomeLayoutMode =
  | "tri-pane"
  | "dual-stack"
  | "dual-tabbed"
  | "main-drawer"
  | "hub";

export const HOME_LAYOUT_BREAKPOINTS = {
  triPane: 2560,
  dualStack: 1920,
  dualTabbed: 1440,
  mainDrawer: 1024,
} as const;

export const HOME_LAYOUT_DIMENSIONS = {
  navRailWidth: 64,
  chartsMin: 560,
  sidePanelMin: 320,
  sidePanelComfort: 360,
  hysteresis: 32,
} as const;

export function resolveHomeLayoutMode(
  shellWidth: number,
  previousMode?: HomeLayoutMode,
): HomeLayoutMode {
  const { triPane, dualStack, dualTabbed, mainDrawer } = HOME_LAYOUT_BREAKPOINTS;
  const hysteresis = HOME_LAYOUT_DIMENSIONS.hysteresis;

  if (previousMode) {
    if (previousMode === "tri-pane" && shellWidth >= triPane - hysteresis) {
      return "tri-pane";
    }
    if (previousMode === "dual-stack" && shellWidth >= dualStack - hysteresis && shellWidth < triPane + hysteresis) {
      if (shellWidth >= triPane) return "tri-pane";
      return "dual-stack";
    }
    if (
      previousMode === "dual-tabbed" &&
      shellWidth >= dualTabbed - hysteresis &&
      shellWidth < dualStack + hysteresis
    ) {
      if (shellWidth >= dualStack) return "dual-stack";
      return "dual-tabbed";
    }
    if (
      previousMode === "main-drawer" &&
      shellWidth >= mainDrawer - hysteresis &&
      shellWidth < dualTabbed + hysteresis
    ) {
      if (shellWidth >= dualTabbed) return "dual-tabbed";
      return "main-drawer";
    }
    if (previousMode === "hub" && shellWidth < mainDrawer + hysteresis) {
      return "hub";
    }
  }

  if (shellWidth >= triPane) return "tri-pane";
  if (shellWidth >= dualStack) return "dual-stack";
  if (shellWidth >= dualTabbed) return "dual-tabbed";
  if (shellWidth >= mainDrawer) return "main-drawer";
  return "hub";
}

export function homeLayoutShowsAppNav(mode: HomeLayoutMode): boolean {
  return mode !== "hub";
}
