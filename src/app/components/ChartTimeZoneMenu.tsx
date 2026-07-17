'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Theme } from '@/lib/chart/contracts';
import type { ChartTimeZone } from '@/lib/chart/timeZone';
import { buildTimeZoneMenuOptions } from '@/lib/chart/timeZone';
import { menuItemClass, popoverPanelClass } from './design-system/styles';
import { clampMenuPosition } from './ContextMenu';

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  selected: ChartTimeZone;
  theme: Theme;
  onSelect: (timeZone: ChartTimeZone) => void;
  onClose: () => void;
};

export default function ChartTimeZoneMenu({
  open,
  anchorRef,
  selected,
  theme,
  onSelect,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const options = buildTimeZoneMenuOptions();

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menuHeight = menu?.getBoundingClientRect().height ?? 320;
    const menuWidth = menu?.getBoundingClientRect().width ?? 220;
    const raw = {
      x: rect.right - menuWidth,
      y: rect.top - menuHeight - 4,
    };
    setPosition(
      clampMenuPosition(raw, menuWidth, menuHeight, window.innerWidth, window.innerHeight),
    );
  }, [open, anchorRef, options.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Select timezone"
      style={position ? { left: position.x, top: position.y } : { visibility: 'hidden' }}
      className={`fixed z-50 max-h-72 min-w-[220px] overflow-y-auto py-1 shadow-lg ${popoverPanelClass(theme)} bg-[var(--edge-surface-popover)] text-[var(--edge-text-primary)]`}
    >
      {options.map((opt, i) => {
        const showDivider =
          opt.section === 'special' && i === 1 && options[i + 1]?.section !== 'special';
        const active = opt.id === selected;
        return (
          <div key={opt.id}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onSelect(opt.id);
                onClose();
              }}
              className={menuItemClass(theme, active)}
            >
              <span className="inline-flex w-4 shrink-0 justify-center" aria-hidden>
                {active ? '✓' : ''}
              </span>
              <span>{opt.label}</span>
            </button>
            {showDivider && (
              <div
                className="my-1 border-t border-[var(--edge-border)]"
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
