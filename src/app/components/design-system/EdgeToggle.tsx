"use client";

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  info?: string;
};

export default function EdgeToggle({ label, checked, onChange, disabled, info }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-[var(--edge-text-primary)]">
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
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`edge-focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--edge-text-strong)]" : "bg-[var(--edge-surface-active)]"
        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--edge-background)] transition-transform ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
