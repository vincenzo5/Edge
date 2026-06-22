import type { Theme } from '@/lib/chartConfig';

/** TradingView-like header chrome tokens. */
export function headerBarClass(theme: Theme, compact?: boolean): string {
  const h = compact ? 'h-8' : 'h-9';
  const isDark = theme === 'dark';
  return `flex shrink-0 items-center gap-0.5 border-b px-2 ${h} text-xs ${
    isDark
      ? 'border-[#1E2030] bg-[#131722] text-[#d1d4dc]'
      : 'border-gray-200 bg-gray-50 text-gray-700'
  }`;
}

export function headerButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  const isDark = theme === 'dark';
  const base = 'inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return isDark
      ? `${base} bg-[#2a2e39] text-[#d1d4dc]`
      : `${base} bg-gray-200 text-gray-900`;
  }
  return isDark
    ? `${base} text-[#d1d4dc] hover:bg-[#2a2e39]`
    : `${base} text-gray-700 hover:bg-gray-200`;
}

export function headerIconButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  const isDark = theme === 'dark';
  const base = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return isDark
      ? `${base} bg-[#2a2e39] text-[#d1d4dc]`
      : `${base} bg-gray-200 text-gray-900`;
  }
  return isDark
    ? `${base} text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]`
    : `${base} text-gray-500 hover:bg-gray-200 hover:text-gray-900`;
}

export function headerDividerClass(theme: Theme): string {
  return theme === 'dark' ? 'mx-0.5 h-4 w-px shrink-0 bg-[#363a45]' : 'mx-0.5 h-4 w-px shrink-0 bg-gray-300';
}

export function popoverPanelClass(theme: Theme): string {
  return theme === 'dark'
    ? 'rounded border border-[#363a45] bg-[#1e222d] text-[#d1d4dc] shadow-xl'
    : 'rounded border border-gray-200 bg-white text-gray-900 shadow-xl';
}

export function menuItemClass(theme: Theme, selected?: boolean, disabled?: boolean): string {
  const base = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (selected) {
    return theme === 'dark'
      ? `${base} rounded bg-[#f0f3fa] text-[#131722]`
      : `${base} rounded bg-gray-900 text-white`;
  }
  return theme === 'dark' ? `${base} hover:bg-[#2a2e39]` : `${base} hover:bg-gray-100`;
}

export function menuSectionHeaderClass(theme: Theme): string {
  return theme === 'dark'
    ? 'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#787b86]'
    : 'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500';
}
