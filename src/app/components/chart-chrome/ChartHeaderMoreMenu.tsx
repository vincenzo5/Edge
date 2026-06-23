'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import { menuItemClass } from './headerStyles';

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
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            title={item.title ?? item.label}
            onClick={() => {
              item.onClick?.();
              setOpen(false);
            }}
            className={menuItemClass(theme, item.active, item.disabled)}
            data-testid={`header-more-${item.id}`}
          >
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
          </button>
        ))}
      </ChartAnchoredPopover>
    </>
  );
}
