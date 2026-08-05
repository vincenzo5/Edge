import type { Theme } from "@/lib/chartConfig";

const motionFast =
  "motion-safe:transition-[background-color,color,border-color,opacity,transform] motion-safe:duration-[var(--edge-motion-fast)] motion-safe:ease";
const motionNormal =
  "motion-safe:transition-[background-color,color,border-color,opacity,transform] motion-safe:duration-[var(--edge-motion-normal)] motion-safe:ease";

/** Panel/section title — ≥14px. */
export function panelTitleClass(strong = false): string {
  return strong ? "edge-type-panel-title-strong" : "edge-type-panel-title";
}

/** Primary body/action copy — ≥12px. */
export function bodyTextClass(): string {
  return "edge-type-body";
}

/** Secondary metadata — ≥12px, muted. */
export function metadataTextClass(): string {
  return "edge-type-metadata";
}

/** Compact annotation — 10px; chart axis labels and section microcopy only. */
export function annotationTextClass(): string {
  return "edge-type-annotation";
}

/** 32px compact control target. */
export function compactControlClass(): string {
  return "edge-control-compact inline-flex items-center";
}

/** 36px standard control target. */
export function standardControlClass(): string {
  return "edge-control-standard inline-flex items-center";
}

/** Header chip / picker trigger — compact height with body text. */
export function headerChipClass(disabled?: boolean): string {
  const base = `edge-focus-ring ${compactControlClass()} gap-1 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-[var(--edge-space-2)] ${bodyTextClass()} ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  return `${base} text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]`;
}

export type FieldDensity = "compact" | "standard";

export type FieldStateOptions = {
  density?: FieldDensity;
  disabled?: boolean;
  invalid?: boolean;
};

function fieldHeightClass(density: FieldDensity): string {
  return density === "compact" ? compactControlClass() : standardControlClass();
}

/** Shared text input surface — compact (32px) or standard (36px). */
export function fieldClass(options: FieldStateOptions = {}): string {
  const density = options.density ?? "standard";
  const base = `edge-focus-ring w-full min-w-0 rounded-[var(--edge-radius-sm)] border bg-[var(--edge-surface-input)] px-[var(--edge-space-2)] ${bodyTextClass()} text-[var(--edge-text-primary)] placeholder:text-[var(--edge-text-muted)] ${fieldHeightClass(density)} ${motionFast}`;
  if (options.disabled) {
    return `${base} cursor-not-allowed border-[var(--edge-border-strong)] opacity-40`;
  }
  if (options.invalid) {
    return `${base} border-[var(--edge-negative)]`;
  }
  return `${base} border-[var(--edge-border-strong)]`;
}

/** Shared native select surface — compact (32px) or standard (36px). */
export function selectClass(options: FieldStateOptions = {}): string {
  return fieldClass(options);
}

/** Labeled field row wrapper — visible label + control. */
export function labeledFieldClass(): string {
  return `inline-flex items-center gap-1.5 ${bodyTextClass()} text-[var(--edge-text-secondary)]`;
}

export type BorderLegendSurface = "toolbar" | "panel";

/** Background token for border-legend label cutouts. */
export function borderLegendSurfaceClass(surface: BorderLegendSurface): string {
  return surface === "toolbar"
    ? "bg-[var(--edge-surface-toolbar)]"
    : "bg-[var(--edge-surface-panel)]";
}

/** Optional extra classes for border-legend label text (surface bg applied separately). */
export function borderLegendLabelClass(): string {
  return "leading-none whitespace-nowrap";
}

/** Icon-only clear control inside search shells. */
export function clearButtonClass(disabled?: boolean): string {
  const base = `edge-focus-ring inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--edge-surface-active)] text-[var(--edge-text-primary)] ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  return `${base} hover:bg-[var(--edge-surface-hover)]`;
}

/** Edge chart header chrome tokens. */
export function headerBarClass(theme: Theme, compact?: boolean): string {
  const h = compact ? "h-8" : "h-9";
  void theme;
  return `flex shrink-0 items-center gap-1 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-1.5 ${h} ${bodyTextClass()} text-[var(--edge-text-primary)]`;
}

export function headerButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring ${compactControlClass()} min-w-[var(--edge-control-height-compact)] gap-1 rounded-[var(--edge-radius-sm)] px-[var(--edge-space-2)] ${bodyTextClass()} font-medium ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]`;
  }
  return `${base} text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]`;
}

/** Destructive chrome action — outline negative semantics. */
export function destructiveButtonClass(theme: Theme, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring ${compactControlClass()} gap-1 rounded-[var(--edge-radius-sm)] border border-[var(--edge-negative)] px-[var(--edge-space-3)] ${bodyTextClass()} font-medium text-[var(--edge-negative)] ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  return `${base} hover:bg-[color-mix(in_srgb,var(--edge-negative)_12%,transparent)]`;
}

/** Inline text action with compact 32px hit area. */
export function linkActionClass(disabled?: boolean): string {
  const base = `edge-focus-ring inline-flex items-center rounded-[var(--edge-radius-sm)] px-[var(--edge-space-2)] ${compactControlClass()} ${bodyTextClass()} text-[var(--edge-accent-blue)] hover:underline ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40 no-underline`;
  }
  return base;
}

/** Non-blocking status / error surface copy. */
export function statusAlertClass(): string {
  return "rounded-[var(--edge-radius-sm)] border border-[var(--edge-negative)]/40 bg-[var(--edge-surface-panel)] px-3 py-2 text-[var(--edge-text-primary)]";
}

export function popoverEnterClass(): string {
  return "edge-popover-enter motion-safe:animate-none";
}

export function primaryButtonClass(theme: Theme, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring ${compactControlClass()} gap-1.5 rounded-[var(--edge-radius-sm)] px-[var(--edge-space-3)] ${bodyTextClass()} font-semibold ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed bg-[var(--edge-accent-blue-fill)] opacity-40 text-[var(--edge-text-on-accent)]`;
  }
  return `${base} bg-[var(--edge-accent-blue-fill)] text-[var(--edge-text-on-accent)] hover:bg-[var(--edge-accent-blue-hover)] hover:text-[var(--edge-text-on-accent)]`;
}

/** Bordered secondary action — denser toolbars where chrome text links lack affordance. */
export function secondaryButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring ${compactControlClass()} gap-1 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2.5 ${bodyTextClass()} font-medium ${motionFast}`;
  if (disabled) {
    return `${base} cursor-not-allowed opacity-40`;
  }
  if (active) {
    return `${base} border-[var(--edge-border-strong)] bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]`;
  }
  return `${base} text-[var(--edge-text-primary)] hover:border-[var(--edge-border-strong)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]`;
}

export function headerIconButtonClass(theme: Theme, active?: boolean, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring inline-flex h-[var(--edge-control-height-compact)] w-[var(--edge-control-height-compact)] shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] ${motionFast}`;
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
  return "edge-popover rounded-[var(--edge-radius-lg)] border";
}

export function menuItemClass(theme: Theme, selected?: boolean, disabled?: boolean): string {
  void theme;
  const base = `edge-focus-ring flex w-full min-h-[var(--edge-control-height-compact)] cursor-pointer items-center gap-[var(--edge-space-2)] px-[var(--edge-space-3)] text-left ${bodyTextClass()} ${motionFast}`;
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
  return "edge-modal-shell overflow-hidden rounded-[var(--edge-radius-dialog)] border";
}

export function modalBackdropClass(options?: { contained?: boolean }): string {
  if (options?.contained) {
    // Fills a parent overlay host (absolute inset-0). pointer-events-auto
    // overrides the host's pointer-events-none so the dialog stays interactive.
    return "pointer-events-auto absolute inset-0 z-[100] flex edge-modal-backdrop px-5";
  }
  // Viewport modals portal to document.body and sit above workspace chrome (z-[210]).
  // EdgeAnchoredPopover uses z-[1400] so selects inside modals stay visible.
  return "fixed inset-0 z-[1300] flex edge-modal-backdrop px-5";
}

export function slideOverBackdropClass(): string {
  return "fixed inset-0 z-[100] edge-modal-backdrop";
}

export function slideOverPanelClass(width: "third" | "half"): string {
  const widthClass =
    width === "half"
      ? "w-[min(50vw,640px)] min-w-[360px]"
      : "w-[min(33vw,480px)] min-w-[320px]";
  return `fixed right-0 top-0 z-[101] flex h-full flex-col overflow-hidden border-l border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] shadow-[var(--edge-shadow-popover)] motion-safe:transition-transform motion-safe:duration-[var(--edge-motion-normal)] ${widthClass}`;
}

export function searchInputShellClass(): string {
  return "flex h-[var(--edge-control-height-standard)] items-center gap-[var(--edge-space-2)] rounded-[var(--edge-radius-lg)] border border-[var(--edge-border-strong)] bg-[var(--edge-surface-input)] px-[var(--edge-space-3)]";
}

export function segmentedTabClass(active: boolean): string {
  return active
    ? "rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
    : "rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]";
}

/** Section nav tab — text + bottom accent underline (no bordered track). */
export function underlineTabClass(active: boolean): string {
  return active
    ? "border-b-2 border-[var(--edge-accent-blue)] text-[var(--edge-text-strong)] font-medium"
    : "border-b-2 border-transparent text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]";
}

export function chipClass(active: boolean): string {
  return active
    ? "bg-[var(--edge-text-strong)] text-[var(--edge-background)]"
    : "bg-[var(--edge-surface-active)] text-[var(--edge-text-primary)]";
}
