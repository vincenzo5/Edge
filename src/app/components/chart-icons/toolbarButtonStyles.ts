/** Shared hit-target dimensions for the drawing toolbar rail. */
export function toolbarButtonClass(compact: boolean): string {
  return compact
    ? "tv-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--tv-radius-sm)] transition-colors"
    : "tv-focus-ring flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[var(--tv-radius-sm)] transition-colors";
}

export function toolbarRailWidthClass(compact: boolean): string {
  return compact ? "w-12" : "w-[60px]";
}

export function toolbarIconSize(compact: boolean): number {
  return compact ? 32 : 36;
}

export function toolbarButtonStateClass(active?: boolean): string {
  return active
    ? "bg-[var(--tv-surface-active)] text-[var(--tv-text-strong)]"
    : "text-[var(--tv-text-secondary)] hover:bg-[var(--tv-surface-hover)] hover:text-[var(--tv-text-primary)]";
}
