'use client';

import type { ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import EdgeMenuItem from '../design-system/EdgeMenuItem';

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

/** Thin chart adapter over shared `EdgeMenuItem`. */
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
    <EdgeMenuItem
      theme={theme}
      label={label}
      selected={selected}
      disabled={disabled}
      disabledReason={disabledReason}
      icon={icon}
      trailing={trailing}
      onClick={onClick}
    />
  );
}
