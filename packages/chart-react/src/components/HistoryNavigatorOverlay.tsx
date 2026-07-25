'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { HistoryNavigatorGeometry } from '../historyNavigator';
import { historyNavigatorBottomPx, historyNavigatorHeightPx } from '../historyNavigator';

export type HistoryNavigatorOverlayHandle = {
  applyGeometry: (geometry: HistoryNavigatorGeometry | null, opaque?: boolean) => void;
  scheduleFade: (delayMs: number) => void;
  hideImmediate: () => void;
};

type Props = {
  width: number;
  height: number;
};

const HistoryNavigatorOverlay = forwardRef<HistoryNavigatorOverlayHandle, Props>(
  function HistoryNavigatorOverlay({ width, height }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      applyGeometry(geometry, opaque = true) {
        const root = rootRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!root || !track || !thumb) return;

        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }

        if (!geometry) {
          root.style.opacity = '0';
          root.style.pointerEvents = 'none';
          return;
        }

        root.style.opacity = opaque ? '1' : root.style.opacity;
        root.style.pointerEvents = 'none';
        track.style.left = `${geometry.trackLeftPct}%`;
        track.style.width = `${geometry.trackWidthPct}%`;
        thumb.style.left = `${geometry.thumbLeftPct}%`;
        thumb.style.width = `${geometry.thumbWidthPct}%`;
        track.dataset.indeterminate = geometry.indeterminateLeft ? 'true' : 'false';
      },
      scheduleFade(delayMs) {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => {
          fadeTimerRef.current = null;
          const root = rootRef.current;
          if (root) root.style.opacity = '0';
        }, delayMs);
      },
      hideImmediate() {
        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
        const root = rootRef.current;
        if (root) root.style.opacity = '0';
      },
    }));

    if (width <= 0 || height <= 0) return null;

    return (
      <div
        ref={rootRef}
        aria-hidden
        className="pointer-events-none absolute z-[21] opacity-0 motion-safe:transition-opacity"
        style={{
          left: 0,
          top: height - historyNavigatorBottomPx() - historyNavigatorHeightPx(),
          width,
          height: historyNavigatorHeightPx(),
          transitionDuration: 'var(--edge-motion-fast, 120ms)',
        }}
        data-edge-history-navigator
      >
        <div
          ref={trackRef}
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--edge-surface-active)]/80 data-[indeterminate=true]:bg-gradient-to-r data-[indeterminate=true]:from-transparent data-[indeterminate=true]:via-[var(--edge-surface-active)]/80 data-[indeterminate=true]:to-[var(--edge-surface-active)]/80"
          style={{ minWidth: 0 }}
        />
        <div
          ref={thumbRef}
          className="absolute top-1/2 h-1.5 min-w-[6px] -translate-y-1/2 rounded-full bg-[var(--edge-accent-blue)]/70"
        />
      </div>
    );
  },
);

export default HistoryNavigatorOverlay;
