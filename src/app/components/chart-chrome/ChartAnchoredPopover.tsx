'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '@/lib/chartConfig';
import { popoverPanelClass } from './headerStyles';
import { computeChartAnchoredPopoverLayout } from './chartAnchoredPopoverLayout';

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
  const [layout, setLayout] = useState<ReturnType<typeof computeChartAnchoredPopoverLayout> | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setLayout(null);
      return;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const anchorRect = anchor.getBoundingClientRect();
      const panelWidth = Math.max(panel.getBoundingClientRect().width, minWidth);
      const contentHeight = panel.scrollHeight;

      setLayout(
        computeChartAnchoredPopoverLayout(
          anchorRect,
          panelWidth,
          contentHeight,
          align,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };

    measure();
    const raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [open, anchorRef, align, minWidth, children]);

  useEffect(() => {
    if (!open) return;

    const remeasure = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const anchorRect = anchor.getBoundingClientRect();
      const panelWidth = Math.max(panel.getBoundingClientRect().width, minWidth);
      const contentHeight = panel.scrollHeight;

      setLayout(
        computeChartAnchoredPopoverLayout(
          anchorRect,
          panelWidth,
          contentHeight,
          align,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };

    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [open, anchorRef, align, minWidth]);

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

  if (!open || !mounted) return null;

  const panel = (
    <div
      ref={panelRef}
      role="menu"
      style={
        layout
          ? {
              left: layout.x,
              top: layout.y,
              minWidth,
              maxHeight: layout.maxHeight,
              overflowY: layout.scrollable ? 'auto' : 'visible',
            }
          : {
              visibility: 'hidden',
              left: 0,
              top: 0,
              minWidth,
              overflowY: 'visible',
            }
      }
      className={`fixed z-[1200] py-1 ${popoverPanelClass(theme)} ${className ?? ''}`}
    >
      {children}
    </div>
  );

  return createPortal(panel, document.body);
}
