"use client";

type SwitchSize = "standard" | "compact";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  ariaLabel?: string;
  testId?: string;
};

export function EdgeToggleSwitch({
  checked,
  onChange,
  disabled,
  size = "standard",
  ariaLabel,
  testId,
}: SwitchProps) {
  const compact = size === "compact";
  const trackClass = compact
    ? `relative h-4 w-7 shrink-0 rounded-full motion-safe:transition-colors ${
        checked ? "bg-[var(--edge-text-strong)]" : "bg-[var(--edge-border-strong)]"
      }`
    : `relative h-5 w-9 shrink-0 rounded-full motion-safe:transition-colors ${
        checked ? "bg-[var(--edge-text-strong)]" : "bg-[var(--edge-surface-active)]"
      }`;
  const thumbClass = compact
    ? `absolute top-0.5 h-3 w-3 rounded-full bg-[var(--edge-background)] motion-safe:transition-transform ${
        checked ? "translate-x-3.5" : "translate-x-0.5"
      }`
    : `absolute top-0.5 h-4 w-4 rounded-full bg-[var(--edge-background)] motion-safe:transition-transform ${
        checked ? "left-[18px]" : "left-0.5"
      }`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`edge-focus-ring relative flex shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] motion-safe:transition-colors ${
        compact ? "h-8 w-8" : "h-8 w-8"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span className={trackClass}>
        <span className={thumbClass} />
      </span>
    </button>
  );
}

type RowProps = SwitchProps & {
  label: string;
  info?: string;
};

export default function EdgeToggle({
  label,
  checked,
  onChange,
  disabled,
  info,
  size = "standard",
  testId,
}: RowProps) {
  return (
    <label className="flex min-h-[var(--edge-control-height-compact)] items-center justify-between gap-3 py-1.5 text-sm text-[var(--edge-text-primary)]">
      <span className="flex items-center gap-1.5">
        {label}
        {info ? (
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--edge-border-strong)] text-[10px] text-[var(--edge-text-secondary)]"
            title={info}
          >
            i
          </span>
        ) : null}
      </span>
      <EdgeToggleSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size={size}
        ariaLabel={label}
        testId={testId}
      />
    </label>
  );
}
