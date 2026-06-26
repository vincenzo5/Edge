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
  return compact ? "h-4 w-4" : "h-[18px] w-[18px]";
}

export function iconRailIconSize(compact: boolean): number {
  return compact ? 16 : 18;
}

export function toolbarButtonStateClass(active?: boolean): string {
  return active
    ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)] ring-1 ring-[var(--edge-border-strong)]"
    : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]";
}
