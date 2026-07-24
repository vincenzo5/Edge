'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import EdgeMenuItem from '../design-system/EdgeMenuItem';

type MoreMenuItem = {
  id: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
  icon?: ReactNode;
};

type Props = {
  theme: Theme;
  items: MoreMenuItem[];
};

export default function ChartHeaderMoreMenu({ theme, items }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        label="More"
        title="More chart actions"
        onClick={() => setOpen((value) => !value)}
        data-testid="header-more-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
      />
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        align="end"
        minWidth={220}
        onClose={() => setOpen(false)}
      >
        {items.map((item) => (
          <EdgeMenuItem
            key={item.id}
            theme={theme}
            label={item.label}
            selected={item.active}
            disabled={item.disabled}
            disabledReason={item.title ?? item.label}
            icon={item.icon}
            testId={`header-more-${item.id}`}
            onClick={() => {
              item.onClick?.();
              setOpen(false);
            }}
          />
        ))}
      </ChartAnchoredPopover>
    </>
  );
}
