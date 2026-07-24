"use client";

import { bodyTextClass, compactControlClass } from "@/app/components/design-system/styles";

type Props = {
  label: string;
  recovering?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Compact pill for chart overlay chrome. */
  compact?: boolean;
  testId?: string;
};

export default function TwsRecoverButton({
  label,
  recovering = false,
  disabled = false,
  onClick,
  compact = false,
  testId = "tws-recover-button",
}: Props) {
  const busy = recovering || disabled;
  const text = recovering ? "Recovering TWS…" : label;

  if (compact) {
    return (
      <button
        type="button"
        data-testid={testId}
        disabled={busy}
        aria-busy={recovering || undefined}
        onClick={onClick}
        className={`edge-focus-ring rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-panel)] px-2 ${compactControlClass()} ${bodyTextClass()} font-medium text-[var(--edge-text-primary)] ring-1 ring-[var(--edge-negative)]/40 hover:bg-[var(--edge-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {text}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      disabled={busy}
      aria-busy={recovering || undefined}
      onClick={onClick}
      className={`edge-focus-ring w-full rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-2 ${compactControlClass()} ${bodyTextClass()} font-medium text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {text}
    </button>
  );
}
