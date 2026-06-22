'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '@/lib/chart/contracts';

const SHOW_DELAY_MS = 400;

type Side = 'bottom' | 'right';

type Props = {
  content?: string;
  theme: Theme;
  children: ReactNode;
  className?: string;
  side?: Side;
  /** Render above overflow-hidden ancestors (e.g. drawing toolbar). */
  portaled?: boolean;
};

const PANEL_POSITION: Record<Side, string> = {
  bottom: 'left-1/2 top-full z-[100] mt-1 -translate-x-1/2',
  right: 'left-full top-1/2 z-[100] ml-1 -translate-y-1/2',
};

function panelStyle(rect: DOMRect, side: Side): CSSProperties {
  if (side === 'right') {
    return {
      position: 'fixed',
      top: rect.top + rect.height / 2,
      left: rect.right + 4,
      transform: 'translateY(-50%)',
      zIndex: 10_000,
    };
  }
  return {
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left + rect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 10_000,
  };
}

export default function Tooltip({
  content,
  theme,
  children,
  className,
  side = 'bottom',
  portaled = false,
}: Props) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [portaledStyle, setPortaledStyle] = useState<CSSProperties | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const updatePortaledPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPortaledStyle(panelStyle(el.getBoundingClientRect(), side));
  }, [side]);

  const show = useCallback(() => {
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      if (portaled) updatePortaledPosition();
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, [clearShowTimer, portaled, updatePortaledPosition]);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
    setPortaledStyle(null);
  }, [clearShowTimer]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  useLayoutEffect(() => {
    if (!visible || !portaled) return;
    updatePortaledPosition();
    const onLayoutChange = () => updatePortaledPosition();
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);
    return () => {
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }, [visible, portaled, updatePortaledPosition]);

  if (!content) {
    return <>{children}</>;
  }

  const isDark = theme === 'dark';
  const panelClass = isDark
    ? 'border border-[#1E2030] bg-[#12131A] text-[#E8E9ED]'
    : 'border border-gray-200 bg-white text-gray-900';

  const panelInner = (
    <span
      id={tooltipId}
      role="tooltip"
      className={`pointer-events-none w-max max-w-56 rounded px-2 py-1 text-[10px] font-normal leading-snug shadow-md ${panelClass} ${
        portaled ? '' : `absolute ${PANEL_POSITION[side]}`
      }`}
      style={portaled ? portaledStyle ?? { visibility: 'hidden' } : undefined}
    >
      {content}
    </span>
  );

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible
        ? portaled && typeof document !== 'undefined'
          ? createPortal(panelInner, document.body)
          : panelInner
        : null}
    </span>
  );
}
