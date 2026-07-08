import type { Theme } from "@/lib/chartConfig";

/** Edge chart header chrome tokens. */
export function headerBarClass(theme: Theme, compact?: boolean): string {
  const h = compact ? "h-8" : "h-9";
  void theme;
  return `flex shrink-0 items-center gap-1 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-1.5 ${h} text-xs text-[var(--edge-text-primary)]`;
}

export function headerButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base =
    "edge-focus-ring inline-flex shrink-0 items-center gap-1 rounded-[var(--edge-radius-sm)] px-2 py-1 text-xs font-medium transition-colors";
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]`;
  }
  return `${base} text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]`;
}

export function primaryButtonClass(theme: Theme, disabled?: boolean): string {
  void theme;
  const base =
    "edge-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-[var(--edge-radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors";
  if (disabled) {
    return `${base} cursor-not-allowed bg-[var(--edge-accent-blue)] opacity-40 text-[var(--edge-text-strong)]`;
  }
  return `${base} bg-[var(--edge-accent-blue)] text-[var(--edge-text-strong)] hover:brightness-110`;
}

export function headerIconButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base =
    "edge-focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] transition-colors";
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]`;
  }
  return `${base} text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]`;
}

export function headerDividerClass(theme: Theme): string {
  void theme;
  return "mx-0.5 h-4 w-px shrink-0 bg-[var(--edge-border-strong)]";
}

export function popoverPanelClass(theme: Theme): string {
  void theme;
  return "edge-popover rounded-[var(--edge-radius-sm)] border";
}

export function menuItemClass(theme: Theme, selected?: boolean, disabled?: boolean): string {
  void theme;
  const base =
    "edge-focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors";
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (selected) {
    return `${base} rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]`;
  }
  return `${base} text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]`;
}

export function menuSectionHeaderClass(theme: Theme): string {
  void theme;
  return "edge-section-header";
}

export function modalShellClass(): string {
  return "edge-modal-shell overflow-hidden rounded-[var(--edge-radius-md)] border";
}

export function modalBackdropClass(): string {
  return "fixed inset-0 z-[100] flex edge-modal-backdrop px-5";
}

export function slideOverBackdropClass(): string {
  return "fixed inset-0 z-[100] edge-modal-backdrop";
}

export function slideOverPanelClass(width: "third" | "half"): string {
  const widthClass =
    width === "half"
      ? "w-[min(50vw,640px)] min-w-[360px]"
      : "w-[min(33vw,480px)] min-w-[320px]";
  return `fixed right-0 top-0 z-[101] flex h-full flex-col overflow-hidden border-l border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] shadow-2xl motion-safe:transition-transform motion-safe:duration-200 ${widthClass}`;
}

export function searchInputShellClass(): string {
  return "flex h-10 items-center gap-2 rounded-[var(--edge-radius-md)] border border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] px-3";
}

export function segmentedTabClass(active: boolean): string {
  return active
    ? "rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
    : "rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]";
}

export function chipClass(active: boolean): string {
  return active
    ? "bg-[var(--edge-text-strong)] text-[var(--edge-background)]"
    : "bg-[var(--edge-surface-active)] text-[var(--edge-text-primary)]";
}
