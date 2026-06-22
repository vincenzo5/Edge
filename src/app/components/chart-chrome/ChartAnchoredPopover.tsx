'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Theme } from '@/lib/chartConfig';
import { clampMenuPosition } from '../ContextMenu';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const panelWidth = panel?.getBoundingClientRect().width ?? minWidth;
    const panelHeight = panel?.getBoundingClientRect().height ?? 320;
    const rawX = align === 'end' ? rect.right - panelWidth : rect.left;
    const raw = { x: rawX, y: rect.bottom + 4 };
    setPosition(
      clampMenuPosition(raw, panelWidth, panelHeight, window.innerWidth, window.innerHeight),
    );
  }, [open, anchorRef, align, minWidth, children]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
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
      ref={panelRef}
      role="menu"
      style={position ? { left: position.x, top: position.y, minWidth } : { visibility: 'hidden', minWidth }}
      className={`fixed z-50 max-h-[70vh] overflow-y-auto py-1 ${popoverPanelClass(theme)} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
