'use client';

import type { Theme } from '@/lib/chartConfig';
import EdgeMenuSectionHeader from '../design-system/EdgeMenuSectionHeader';

type Props = {
  theme: Theme;
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
};

/** Thin chart adapter over shared `EdgeMenuSectionHeader`. */
export default function ChartMenuSectionHeader({
  theme: _theme,
  label,
  collapsed,
  onToggle,
}: Props) {
  return (
    <EdgeMenuSectionHeader label={label} collapsed={collapsed} onToggle={onToggle} />
  );
}
