'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChartEventKind, Theme } from '@edge/chart-core';
import { formatAxisTime } from '@edge/chart-core/time';
import type { EventBadgeGroup } from '../engine/eventBadges';
import { dominantEventKind, eventBadgeColor } from '../engine/eventBadges';

export type EventDetailAnchor = {
  clientX: number;
  clientY: number;
  plotX: number;
  plotY: number;
};

type Props = {
  open: boolean;
  group: EventBadgeGroup | null;
  anchor: EventDetailAnchor | null;
  theme: Theme;
  chartBounds: DOMRect | null;
  interval?: string;
  onClose: () => void;
  onMoreEvents?: (group: EventBadgeGroup) => void;
};

const KIND_LABEL: Record<ChartEventKind, string> = {
  earnings: 'Earnings',
  dividend: 'Dividend',
  split: 'Split',
  filing: 'SEC Filing',
  macro: 'Macro',
  news: 'News',
  options_expiration: 'Options',
};

const KIND_ORDER: ChartEventKind[] = [
  'earnings',
  'dividend',
  'split',
  'filing',
  'macro',
  'news',
  'options_expiration',
];

const CARD_WIDTH = 280;
const CARD_MAX_HEIGHT = 320;

function clampPosition(
  anchor: EventDetailAnchor,
  cardWidth: number,
  cardHeight: number,
  bounds: DOMRect | null,
): { left: number; top: number } {
  const margin = 8;
  const viewportW = bounds?.width ?? window.innerWidth;
  const viewportH = bounds?.height ?? window.innerHeight;
  const originX = bounds?.left ?? 0;
  const originY = bounds?.top ?? 0;

  let left = anchor.clientX - originX + 12;
  let top = anchor.clientY - originY - cardHeight - 12;

  if (top < margin) {
    top = anchor.clientY - originY + 16;
  }
  if (left + cardWidth > viewportW - margin) {
    left = viewportW - cardWidth - margin;
  }
  if (left < margin) left = margin;
  if (top + cardHeight > viewportH - margin) {
    top = viewportH - cardHeight - margin;
  }

  return { left, top };
}

function sortedEvents(group: EventBadgeGroup) {
  return [...group.events].sort((a, b) => {
    const kindDiff =
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    if (kindDiff !== 0) return kindDiff;
    return b.timestamp - a.timestamp;
  });
}

export default function EventDetailCard({
  open,
  group,
  anchor,
  theme,
  chartBounds,
  interval,
  onClose,
  onMoreEvents,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null);
      return;
    }
    const panel = panelRef.current;
    const height = panel?.offsetHeight ?? CARD_MAX_HEIGHT;
    setPosition(clampPosition(anchor, CARD_WIDTH, height, chartBounds));
  }, [open, anchor, chartBounds, group?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose]);

  if (!open || !group || !anchor) return null;

  const kind = dominantEventKind(group.events);
  const accent = eventBadgeColor(kind, theme);
  const isDark = theme === 'dark';
  const dateLabel = formatAxisTime(
    group.timestamp,
    interval as Parameters<typeof formatAxisTime>[1],
  );
  const events = sortedEvents(group);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Event details"
      style={{
        position: 'absolute',
        left: position?.left ?? anchor.plotX,
        top: position?.top ?? anchor.plotY,
        width: CARD_WIDTH,
        maxHeight: CARD_MAX_HEIGHT,
        visibility: position ? 'visible' : 'hidden',
        zIndex: 40,
        borderRadius: 8,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
        background: isDark ? '#1e222d' : '#ffffff',
        boxShadow: isDark
          ? '0 8px 24px rgba(0,0,0,0.45)'
          : '0 8px 24px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: accent,
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {group.glyph}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#d1d4dc' : '#131722',
            }}
          >
            {group.events.length > 1
              ? `${group.events.length} events`
              : KIND_LABEL[kind] ?? kind}
          </div>
          <div
            style={{
              fontSize: 11,
              color: isDark ? '#787b86' : '#6a6d78',
              marginTop: 2,
            }}
          >
            {dateLabel}
          </div>
        </div>
      </div>

      <div style={{ maxHeight: CARD_MAX_HEIGHT - 96, overflowY: 'auto' }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: isDark ? '#787b86' : '#6a6d78',
                marginBottom: 4,
              }}
            >
              {KIND_LABEL[event.kind] ?? event.kind}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.35,
                color: isDark ? '#d1d4dc' : '#131722',
              }}
            >
              {event.title}
            </div>
          </div>
        ))}
      </div>

      {onMoreEvents && (
        <button
          type="button"
          onClick={() => onMoreEvents(group)}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            background: 'transparent',
            color: isDark ? '#2962ff' : '#1e53e5',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          More events
        </button>
      )}
    </div>
  );
}

export type { EventBadgeGroup };
