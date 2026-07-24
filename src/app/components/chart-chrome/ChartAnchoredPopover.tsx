'use client';

import type { ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import EdgeAnchoredPopover from '../design-system/EdgeAnchoredPopover';
import { popoverPanelClass } from './headerStyles';

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  theme: Theme;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  minWidth?: number;
};

/** Thin chart adapter over shared `EdgeAnchoredPopover`. */
export default function ChartAnchoredPopover({
  open,
  anchorRef,
  theme,
  onClose,
  children,
  className,
  align = 'start',
  minWidth = 200,
}: Props) {
  return (
    <EdgeAnchoredPopover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      panelClassName={popoverPanelClass(theme)}
      className={className}
      align={align}
      minWidth={minWidth}
    >
      {children}
    </EdgeAnchoredPopover>
  );
}
