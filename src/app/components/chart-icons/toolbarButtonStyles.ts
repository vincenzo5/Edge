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
