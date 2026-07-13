'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '@/lib/chartConfig';
import { popoverPanelClass } from './headerStyles';
import {
  computeChartAnchoredPopoverLayout,
  isSameChartAnchoredPopoverLayout,
  type ChartAnchoredPopoverLayout,
} from './chartAnchoredPopoverLayout';

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
  const contentRef = useRef<HTMLDivElement>(null);
  const measureFrameRef = useRef<number | null>(null);
  const [layout, setLayout] = useState<ChartAnchoredPopoverLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const commitLayout = useCallback((next: ChartAnchoredPopoverLayout | null) => {
    setLayout((prev) => (isSameChartAnchoredPopoverLayout(prev, next) ? prev : next));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const measureLayout = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!anchor || !panel || !content) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelWidth = Math.max(panel.getBoundingClientRect().width, minWidth);
    const contentHeight = content.scrollHeight;

    const next = computeChartAnchoredPopoverLayout(
      anchorRect,
      panelWidth,
      contentHeight,
      align,
      window.innerWidth,
      window.innerHeight,
    );

    commitLayout(next);
  }, [align, anchorRef, commitLayout, minWidth]);

  const scheduleMeasureLayout = useCallback(() => {
    if (measureFrameRef.current != null) return;
    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measureLayout();
    });
  }, [measureLayout]);

  useEffect(() => {
    if (open) return;
    setLayout((prev) => (prev == null ? prev : null));
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    scheduleMeasureLayout();
    return () => {
      if (measureFrameRef.current != null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [open, scheduleMeasureLayout]);

  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => scheduleMeasureLayout());
    observer.observe(content);
    window.addEventListener('resize', scheduleMeasureLayout);
    window.addEventListener('scroll', scheduleMeasureLayout, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasureLayout);
      window.removeEventListener('scroll', scheduleMeasureLayout, true);
    };
  }, [open, scheduleMeasureLayout]);

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
      <div ref={contentRef}>{children}</div>
    </div>
  );

  return createPortal(panel, document.body);
}
