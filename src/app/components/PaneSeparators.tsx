'use client';

import { useCallback, useRef, useState } from 'react';
import type { Theme } from '@/lib/chartConfig';
import type { PaneBoundary } from '@/lib/chart/panes';
import { PANE_SEPARATOR_HEIGHT, PANE_SEPARATOR_HIT } from '@/lib/chart/panes';

type Props = {
  boundaries: PaneBoundary[];
  width: number;
  theme: Theme;
  onResize: (boundaryIndex: number, deltaY: number) => void;
  onResizeEnd: () => void;
};

export default function PaneSeparators({
  boundaries,
  width,
  theme,
  onResize,
  onResizeEnd,
}: Props) {
  void theme;
  const dragRef = useRef<{ boundaryIndex: number; startY: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const finishDrag = useCallback(() => {
    dragRef.current = null;
    setActiveIndex(null);
    onResizeEnd();
  }, [onResizeEnd]);

  const handlePointerDown = useCallback(
    (boundaryIndex: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { boundaryIndex, startY: e.clientY };
      setActiveIndex(boundaryIndex);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      e.stopPropagation();
      const deltaY = e.clientY - drag.startY;
      if (deltaY === 0) return;
      onResize(drag.boundaryIndex, deltaY);
      dragRef.current = { ...drag, startY: e.clientY };
    },
    [onResize]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      finishDrag();
    },
    [finishDrag]
  );

  if (boundaries.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden
    >
      {boundaries.map((boundary) => {
        const isActive = activeIndex === boundary.index;
        const isHover = hoverIndex === boundary.index;
        const lineColor = isActive
          ? 'var(--tv-focus)'
          : isHover
            ? 'var(--tv-text-secondary)'
            : 'var(--tv-border-strong)';

        const lineTop = (PANE_SEPARATOR_HIT - PANE_SEPARATOR_HEIGHT) / 2;

        return (
          <div
            key={boundary.index}
            className="pointer-events-auto absolute left-0"
            style={{
              top: boundary.top,
              width,
              height: PANE_SEPARATOR_HIT,
              cursor: boundary.disabled ? 'default' : 'ns-resize',
            }}
            onPointerDown={
              boundary.disabled
                ? undefined
                : (e) => handlePointerDown(boundary.index, e)
            }
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={finishDrag}
            onMouseEnter={() => !boundary.disabled && setHoverIndex(boundary.index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div
              className="absolute inset-x-0 transition-colors duration-100"
              style={{
                top: lineTop,
                height: PANE_SEPARATOR_HEIGHT,
                backgroundColor: lineColor,
                opacity: boundary.disabled ? 0.35 : 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
