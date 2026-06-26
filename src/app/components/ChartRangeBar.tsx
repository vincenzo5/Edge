'use client';

import { useEffect, useRef, useState } from 'react';
import type { Range, Theme } from '@/lib/chart/contracts';
import type { ChartTimeZone } from '@/lib/chart/timeZone';
import { formatClockLabel } from '@/lib/chart/timeZone';
import { BOTTOM_RANGE_PRESETS, rangePresetLabel } from '@/lib/chart/rangePresets';
import { useElementSize } from '@/lib/responsive/useElementSize';
import ChartTimeZoneMenu from './ChartTimeZoneMenu';

type Props = {
  selectedPreset: Range | null;
  theme: Theme;
  compact?: boolean;
  timeZone: ChartTimeZone;
  exchange?: string | null;
  onRangeSelect: (range: Range) => void;
  onGoToClick?: () => void;
  onTimeZoneChange: (timeZone: ChartTimeZone) => void;
};

const CLOCK_PLACEHOLDER = '--:--:-- UTC';

function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function GoToCalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M2.5 11.5l2-2 1.5 1.5L8 8l3.5 3"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChartRangeBar({
  selectedPreset,
  theme,
  compact = false,
  timeZone,
  exchange,
  onRangeSelect,
  onGoToClick,
  onTimeZoneChange,
}: Props) {
  void theme;
  const now = useNow();
  const clockRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [barRef, barSize] = useElementSize<HTMLDivElement>();
  const compactClock = barSize.width > 0 && barSize.width < 420;
  const clockLabel = now
    ? formatClockLabel(timeZone, exchange, now)
    : CLOCK_PLACEHOLDER;
  const displayClockLabel = compactClock && clockLabel.length > 8
    ? clockLabel.slice(-8)
    : clockLabel;

  return (
    <>
      <div
        ref={barRef}
        className={`flex min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto border-t px-2 ${
          compact ? 'h-6 text-[10px]' : 'h-7 text-[11px]'
        } border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)] text-[var(--edge-text-secondary)]`}
        role="toolbar"
        aria-label="Chart range"
      >
        <div className="flex min-w-max items-center gap-0.5">
        {BOTTOM_RANGE_PRESETS.map((preset) => {
          const active = preset === selectedPreset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onRangeSelect(preset)}
              className={`rounded-[var(--edge-radius-xs)] px-1.5 py-0.5 font-medium transition-colors ${
                active
                  ? 'bg-[var(--edge-surface-active)] font-semibold text-[var(--edge-text-strong)]'
                  : 'hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]'
              }`}
              aria-pressed={active}
            >
              {rangePresetLabel(preset)}
            </button>
          );
        })}

        {onGoToClick && (
          <>
            <span
              className="mx-1 h-4 w-px shrink-0 bg-[var(--edge-border)]"
              aria-hidden
            />
            <button
              type="button"
              onClick={onGoToClick}
              className="rounded p-1 transition-colors hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
              aria-label="Go to date"
              title="Go to date"
            >
              <GoToCalendarIcon />
            </button>
          </>
        )}
        </div>

        <button
          ref={clockRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono tabular-nums transition-colors ${
            'hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]'
          } ${menuOpen ? 'bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]' : ''}`}
          aria-label={`Chart timezone: ${clockLabel}. Click to change.`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Change timezone"
        >
          {displayClockLabel}
        </button>
      </div>

      <ChartTimeZoneMenu
        open={menuOpen}
        anchorRef={clockRef}
        selected={timeZone}
        theme={theme}
        onSelect={onTimeZoneChange}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
