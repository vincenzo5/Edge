/** Shared hit-target dimensions for the drawing toolbar rail. */
export function toolbarButtonClass(compact: boolean): string {
  return compact
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded transition-colors"
    : "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded transition-colors";
}

export function toolbarRailWidthClass(compact: boolean): string {
  return compact ? "w-12" : "w-[60px]";
}

export function toolbarIconSize(compact: boolean): number {
  return compact ? 32 : 36;
}

export function toolbarButtonStateClass(active?: boolean): string {
  return active
    ? "bg-[#2a2e39] text-[#d1d4dc] dark:bg-[#2a2e39] dark:text-[#d1d4dc]"
    : "text-[#787b86] hover:bg-[#1e222d] hover:text-[#d1d4dc] dark:text-[#787b86] dark:hover:bg-[#1e222d] dark:hover:text-[#d1d4dc]";
}
