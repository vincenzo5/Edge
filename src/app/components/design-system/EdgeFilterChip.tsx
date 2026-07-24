"use client";

type Props = {
  label: string;
  variant?: "dismissible" | "static";
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  "data-testid"?: string;
};

export default function EdgeFilterChip({
  label,
  variant = "static",
  onDismiss,
  dismissLabel,
  className = "",
  "data-testid": testId,
}: Props) {
  const shellClass =
    variant === "dismissible"
      ? "inline-flex items-center gap-1 rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-[10px] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
      : "rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-xs text-[var(--edge-text-primary)]";

  if (variant === "dismissible") {
    return (
      <button
        type="button"
        data-testid={testId}
        className={`edge-focus-ring ${shellClass} ${className}`.trim()}
        onClick={onDismiss}
        aria-label={dismissLabel ?? `Remove ${label}`}
      >
        <span>{label}</span>
        <span aria-hidden>×</span>
      </button>
    );
  }

  return (
    <span data-testid={testId} className={`${shellClass} ${className}`.trim()}>
      {label}
    </span>
  );
}
