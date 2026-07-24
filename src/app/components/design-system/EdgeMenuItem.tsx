"use client";

import type { ReactNode } from "react";
import type { Theme } from "@/lib/chartConfig";
import { menuItemClass } from "./styles";

type Props = {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  selected?: boolean;
  hasSubmenu?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  testId?: string;
  role?: "menuitem" | "none";
  theme?: Theme;
  onClick?: () => void;
};

export default function EdgeMenuItem({
  label,
  shortcut,
  danger,
  disabled,
  disabledReason,
  selected,
  hasSubmenu,
  icon,
  trailing,
  testId,
  role = "menuitem",
  theme = "dark",
  onClick,
}: Props) {
  const hasTrailingCluster = Boolean(trailing || shortcut || hasSubmenu);

  return (
    <button
      type="button"
      role={role === "none" ? undefined : role}
      aria-disabled={disabled || undefined}
      title={disabled ? disabledReason : undefined}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
      data-testid={testId}
      data-danger={danger ? "true" : undefined}
      className={menuItemClass(theme, selected, disabled)}
    >
      {icon ? (
        <span className="inline-flex w-5 shrink-0 items-center justify-center">{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {hasTrailingCluster ? (
        <span className="ml-4 flex shrink-0 items-center gap-2 text-xs text-[var(--edge-text-muted)]">
          {trailing}
          {shortcut ? <span>{shortcut}</span> : null}
          {hasSubmenu ? <span>›</span> : null}
        </span>
      ) : null}
    </button>
  );
}
