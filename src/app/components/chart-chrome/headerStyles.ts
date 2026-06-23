import type { Theme } from '@/lib/chartConfig';

/** TradingView-like header chrome tokens. */
export function headerBarClass(theme: Theme, compact?: boolean): string {
  const h = compact ? 'h-8' : 'h-9';
  void theme;
  return `flex shrink-0 items-center gap-0.5 border-b border-[var(--tv-border)] bg-[var(--tv-surface-toolbar)] px-2 ${h} text-xs text-[var(--tv-text-primary)]`;
}

export function headerButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base = 'tv-focus-ring inline-flex shrink-0 items-center gap-1 rounded-[var(--tv-radius-sm)] px-2 py-1 text-xs font-medium transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} bg-[var(--tv-surface-active)] text-[var(--tv-text-strong)]`;
  }
  return `${base} text-[var(--tv-text-primary)] hover:bg-[var(--tv-surface-hover)] hover:text-[var(--tv-text-strong)]`;
}

export function headerIconButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base = 'tv-focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--tv-radius-sm)] transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} bg-[var(--tv-surface-active)] text-[var(--tv-text-strong)]`;
  }
  return `${base} text-[var(--tv-text-secondary)] hover:bg-[var(--tv-surface-hover)] hover:text-[var(--tv-text-primary)]`;
}

export function headerDividerClass(theme: Theme): string {
  void theme;
  return 'mx-0.5 h-4 w-px shrink-0 bg-[var(--tv-border-strong)]';
}

export function popoverPanelClass(theme: Theme): string {
  void theme;
  return 'tv-popover rounded-[var(--tv-radius-sm)] border';
}

export function menuItemClass(theme: Theme, selected?: boolean, disabled?: boolean): string {
  void theme;
  const base = 'tv-focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (selected) {
    return `${base} rounded-[var(--tv-radius-sm)] bg-[var(--tv-surface-active)] text-[var(--tv-text-strong)]`;
  }
  return `${base} text-[var(--tv-text-primary)] hover:bg-[var(--tv-surface-hover)]`;
}

export function menuSectionHeaderClass(theme: Theme): string {
  void theme;
  return 'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tv-text-secondary)]';
}
