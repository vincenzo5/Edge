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
    ? `relative h-4 w-7 shrink-0 overflow-hidden rounded-full border motion-safe:transition-colors ${
        checked
          ? "border-transparent bg-[var(--edge-accent-blue-fill)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          : "border-[var(--edge-border-strong)] bg-[var(--edge-surface-active)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
      }`
    : `relative h-5 w-9 shrink-0 overflow-hidden rounded-full border motion-safe:transition-colors ${
        checked
          ? "border-transparent bg-[var(--edge-accent-blue-fill)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          : "border-[var(--edge-border-strong)] bg-[var(--edge-surface-active)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
      }`;
  const thumbClass = compact
    ? `absolute top-0.5 h-3 w-3 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.35)] motion-safe:transition-[left,background-color] ${
        checked
          ? "left-3.5 bg-[var(--edge-text-on-accent)]"
          : "left-0.5 bg-[var(--edge-text-secondary)]"
      }`
    : `absolute top-0.5 h-4 w-4 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.35)] motion-safe:transition-[left,background-color] ${
        checked
          ? "left-[18px] bg-[var(--edge-text-on-accent)]"
          : "left-0.5 bg-[var(--edge-text-secondary)]"
      }`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={testId}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`edge-focus-ring relative inline-flex shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] ${
        compact ? "h-8 min-w-8 px-0.5" : "h-8 min-w-10 px-0.5"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={trackClass}
        data-checked={checked ? "true" : "false"}
        data-size={size}
        data-slot="track"
      >
        <span className={thumbClass} data-slot="thumb" />
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
