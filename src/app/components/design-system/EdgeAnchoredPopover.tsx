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
import {
  computeEdgeAnchoredPopoverLayout,
  isSameEdgeAnchoredPopoverLayout,
  type EdgeAnchoredPopoverLayout,
} from './edgeAnchoredPopoverLayout';
import { useMenuKeyboardNav } from './useMenuKeyboardNav';
import { popoverEnterClass } from './styles';

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  className?: string;
  align?: 'start' | 'end';
  minWidth?: number;
  role?: 'menu' | 'dialog' | 'none';
  enableMenuKeyboardNav?: boolean;
};

export default function EdgeAnchoredPopover({
  open,
  anchorRef,
  onClose,
  children,
  panelClassName = 'edge-popover rounded-[var(--edge-radius-lg)] border',
  className,
  align = 'start',
  minWidth = 200,
  role = 'menu',
  enableMenuKeyboardNav = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureFrameRef = useRef<number | null>(null);
  const [layout, setLayout] = useState<EdgeAnchoredPopoverLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const commitLayout = useCallback((next: EdgeAnchoredPopoverLayout | null) => {
    setLayout((prev) => (isSameEdgeAnchoredPopoverLayout(prev, next) ? prev : next));
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

    const next = computeEdgeAnchoredPopoverLayout(
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

  const handleClose = useCallback(() => {
    onClose();
    anchorRef.current?.focus();
  }, [anchorRef, onClose]);

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
        handleClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open, handleClose, anchorRef]);

  useMenuKeyboardNav({
    open: open && enableMenuKeyboardNav,
    containerRef: contentRef,
    anchorRef,
    onClose: handleClose,
  });

  if (!open || !mounted) return null;

  const panel = (
    <div
      ref={panelRef}
      role={role === 'none' ? undefined : role}
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
      className={`fixed z-[1400] py-1 ${popoverEnterClass()} ${panelClassName} ${className ?? ''}`}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );

  return createPortal(panel, document.body);
}
