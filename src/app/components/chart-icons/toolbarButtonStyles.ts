export type IconRailEdge = "left" | "right";

/** Outer shell shared by the left drawing toolbar and right sidebar rails. */
export function iconRailShellClass(compact: boolean, edge: IconRailEdge): string {
  const border =
    edge === "left"
      ? "border-r border-[var(--edge-border)]"
      : "border-l border-[var(--edge-border)]";
  return `relative z-50 flex h-full shrink-0 flex-col items-stretch self-stretch ${border} bg-[var(--edge-surface-rail)] px-0.5 py-1.5 ${iconRailWidthClass(compact)}`;
}

/** Slim icon rail shared by the left drawing toolbar and right sidebar. */
export function iconRailButtonClass(compact: boolean): string {
  return compact
    ? "edge-focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] transition-colors"
    : "edge-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] transition-colors";
}

export function iconRailWidthClass(compact: boolean): string {
  return compact ? "w-10" : "w-11";
}

export function iconRailIconClass(compact: boolean): string {
  return compact ? "h-5 w-5" : "h-[22px] w-[22px]";
}

export function iconRailIconSize(compact: boolean): number {
  return compact ? 20 : 22;
}

export function toolbarButtonStateClass(active?: boolean): string {
  return active
    ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-rail-active)]"
    : "text-[var(--edge-text-rail)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-rail-active)]";
}
