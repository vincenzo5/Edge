"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  hasSubmenu?: boolean;
  icon?: ReactNode;
  testId?: string;
  onClick?: () => void;
};

export default function EdgeMenuItem({
  label,
  shortcut,
  danger,
  disabled,
  hasSubmenu,
  icon,
  testId,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      data-danger={danger ? "true" : undefined}
      className="edge-menu-item edge-focus-ring"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {icon ? <span className="inline-flex w-5 shrink-0 items-center justify-center">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="ml-4 flex shrink-0 items-center gap-2 text-xs text-[var(--edge-text-muted)]">
        {shortcut ? <span>{shortcut}</span> : null}
        {hasSubmenu ? <span>›</span> : null}
      </span>
    </button>
  );
}
