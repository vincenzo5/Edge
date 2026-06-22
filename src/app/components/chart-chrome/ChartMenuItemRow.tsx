'use client';

import type { ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { menuItemClass } from './headerStyles';

type Props = {
  theme: Theme;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
};

export default function ChartMenuItemRow({
  theme,
  label,
  selected,
  disabled,
  disabledReason,
  icon,
  trailing,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
      disabled={disabled}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      className={menuItemClass(theme, selected, disabled)}
    >
      {icon ? <span className="inline-flex w-5 shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
