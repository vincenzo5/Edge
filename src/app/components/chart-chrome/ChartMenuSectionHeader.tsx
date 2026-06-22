'use client';

import type { Theme } from '@/lib/chartConfig';
import { menuSectionHeaderClass } from './headerStyles';

type Props = {
  theme: Theme;
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function ChartMenuSectionHeader({
  theme,
  label,
  collapsed,
  onToggle,
}: Props) {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between ${menuSectionHeaderClass(theme)} hover:opacity-80`}
      >
        <span>{label}</span>
        <span aria-hidden>{collapsed ? '▾' : '▴'}</span>
      </button>
    );
  }
  return <div className={menuSectionHeaderClass(theme)}>{label}</div>;
}
