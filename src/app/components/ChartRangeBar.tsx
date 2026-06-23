'use client';

import { useEffect, useRef, useState } from 'react';
import type { Range, Theme } from '@/lib/chart/contracts';
import type { ChartTimeZone } from '@/lib/chart/timeZone';
import { formatClockLabel } from '@/lib/chart/timeZone';
import { BOTTOM_RANGE_PRESETS, rangePresetLabel } from '@/lib/chart/rangePresets';
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
  const isDark = theme === 'dark';
  const now = useNow();
  const clockRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const clockLabel = now
    ? formatClockLabel(timeZone, exchange, now)
    : CLOCK_PLACEHOLDER;

  return (
    <>
      <div
        className={`flex shrink-0 items-center gap-0.5 border-t px-2 ${
          compact ? 'h-6 text-[10px]' : 'h-7 text-xs'
        } ${
          isDark
            ? 'border-[#1E2030] bg-[#12131A] text-[#8B8FA3]'
            : 'border-gray-200 bg-gray-100 text-gray-600'
        }`}
        role="toolbar"
        aria-label="Chart range"
      >
        {BOTTOM_RANGE_PRESETS.map((preset) => {
          const active = preset === selectedPreset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onRangeSelect(preset)}
              className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                active
                  ? isDark
                    ? 'bg-[#1E2030] text-[#E8E9ED]'
                    : 'bg-white text-gray-900 shadow-sm'
                  : isDark
                    ? 'hover:bg-[#1E2030]/60 hover:text-[#E8E9ED]'
                    : 'hover:bg-white/80 hover:text-gray-900'
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
              className={`mx-1 h-4 w-px shrink-0 ${isDark ? 'bg-[#1E2030]' : 'bg-gray-300'}`}
              aria-hidden
            />
            <button
              type="button"
              onClick={onGoToClick}
              className={`rounded p-1 transition-colors ${
                isDark
                  ? 'hover:bg-[#1E2030]/60 hover:text-[#E8E9ED]'
                  : 'hover:bg-white/80 hover:text-gray-900'
              }`}
              aria-label="Go to date"
              title="Go to date"
            >
              <GoToCalendarIcon />
            </button>
          </>
        )}

        <button
          ref={clockRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`ml-auto rounded px-1.5 py-0.5 font-mono tabular-nums transition-colors ${
            isDark
              ? 'hover:bg-[#1E2030]/60 hover:text-[#E8E9ED]'
              : 'hover:bg-white/80 hover:text-gray-900'
          } ${menuOpen ? (isDark ? 'bg-[#1E2030] text-[#E8E9ED]' : 'bg-white text-gray-900 shadow-sm') : ''}`}
          aria-label={`Chart timezone: ${clockLabel}. Click to change.`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Change timezone"
        >
          {clockLabel}
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
