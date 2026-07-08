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
const VIEWPORT_PADDING_PX = 8;
const MAX_TOOLTIP_WIDTH_PX = 224; // Tailwind max-w-56.
const ESTIMATED_TOOLTIP_HEIGHT_PX = 48;

type Side = 'bottom' | 'left' | 'right' | 'top';

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
  top: 'left-1/2 bottom-full z-[100] mb-1 -translate-x-1/2',
  left: 'right-full top-1/2 z-[100] mr-1 -translate-y-1/2',
  right: 'left-full top-1/2 z-[100] ml-1 -translate-y-1/2',
};

function panelStyle(rect: DOMRect, side: Side): CSSProperties {
  const viewportWidth =
    typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerHeight;
  const horizontalCenter = Math.min(
    Math.max(
      rect.left + rect.width / 2,
      VIEWPORT_PADDING_PX + MAX_TOOLTIP_WIDTH_PX / 2,
    ),
    Math.max(
      VIEWPORT_PADDING_PX + MAX_TOOLTIP_WIDTH_PX / 2,
      viewportWidth - VIEWPORT_PADDING_PX - MAX_TOOLTIP_WIDTH_PX / 2,
    ),
  );
  const verticalCenter = Math.min(
    Math.max(rect.top + rect.height / 2, VIEWPORT_PADDING_PX),
    Math.max(VIEWPORT_PADDING_PX, viewportHeight - VIEWPORT_PADDING_PX),
  );

  if (side === 'left') {
    const hasRoomLeft = rect.left - MAX_TOOLTIP_WIDTH_PX - 4 >= VIEWPORT_PADDING_PX;
    return {
      position: 'fixed',
      top: verticalCenter,
      left: hasRoomLeft ? rect.left - 4 : rect.right + 4,
      transform: hasRoomLeft ? 'translate(-100%, -50%)' : 'translateY(-50%)',
      zIndex: 10_000,
    };
  }
  if (side === 'right') {
    const hasRoomRight = rect.right + MAX_TOOLTIP_WIDTH_PX + 4 <= viewportWidth - VIEWPORT_PADDING_PX;
    return {
      position: 'fixed',
      top: verticalCenter,
      left: hasRoomRight ? rect.right + 4 : rect.left - 4,
      transform: hasRoomRight ? 'translateY(-50%)' : 'translate(-100%, -50%)',
      zIndex: 10_000,
    };
  }
  if (side === 'top') {
    const hasRoomAbove = rect.top - 4 - ESTIMATED_TOOLTIP_HEIGHT_PX >= VIEWPORT_PADDING_PX;
    return {
      position: 'fixed',
      top: hasRoomAbove ? rect.top - 4 : rect.bottom + 4,
      left: horizontalCenter,
      transform: hasRoomAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      zIndex: 10_000,
    };
  }
  const hasRoomBelow =
    rect.bottom + 4 + ESTIMATED_TOOLTIP_HEIGHT_PX <= viewportHeight - VIEWPORT_PADDING_PX;
  return {
    position: 'fixed',
    top: hasRoomBelow ? rect.bottom + 4 : rect.top - 4,
    left: horizontalCenter,
    transform: hasRoomBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
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

  void theme;
  const panelClass = 'edge-popover border';

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
