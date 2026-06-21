'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Theme } from '@/lib/chart/contracts';

const SHOW_DELAY_MS = 400;

type Props = {
  content?: string;
  theme: Theme;
  children: ReactNode;
  className?: string;
};

export default function Tooltip({ content, theme, children, className }: Props) {
  const tooltipId = useId();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearShowTimer();
    showTimerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
  }, [clearShowTimer]);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  if (!content) {
    return <>{children}</>;
  }

  const isDark = theme === 'dark';
  const panel = isDark
    ? 'border border-[#1E2030] bg-[#12131A] text-[#E8E9ED]'
    : 'border border-gray-200 bg-white text-gray-900';

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute left-0 top-full z-50 mt-1 w-max max-w-56 rounded px-2 py-1 text-[10px] font-normal leading-snug shadow-md ${panel}`}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
