'use client';

import { useEffect, useRef, useState } from 'react';
import type { Range, Theme } from '@edge/chart-core/contracts';
import type { ChartTimeZone } from '@edge/chart-core/timeZone';
import { formatClockAbbreviation, formatClockLabel } from '@edge/chart-core/timeZone';
import { BOTTOM_RANGE_PRESETS, rangePresetLabel } from '@edge/chart-react/engine/rangePresets';
import { useElementSize } from '@/lib/responsive/useElementSize';
import {
  bodyTextClass,
  compactControlClass,
  headerDividerClass,
  metadataTextClass,
} from '../design-system/styles';
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

const CLOCK_PLACEHOLDER_TIME = '--:--:--';

function clockPlaceholder(
  timeZone: ChartTimeZone,
  exchange?: string | null,
): string {
  return `${CLOCK_PLACEHOLDER_TIME} ${formatClockAbbreviation(timeZone, exchange)}`;
}

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
  const now = useNow();
  const clockRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [barRef, barSize] = useElementSize<HTMLDivElement>();
  const compactClock = barSize.width > 0 && barSize.width < 420;
  const clockLabel = now
    ? formatClockLabel(timeZone, exchange, now)
    : clockPlaceholder(timeZone, exchange);
  const displayClockLabel = compactClock && clockLabel.length > 8
    ? clockLabel.slice(-8)
    : clockLabel;

  const pillBaseClass = `${compactControlClass()} edge-focus-ring min-w-[var(--edge-control-height-compact)] justify-center rounded-[var(--edge-radius-xs)] px-2 ${bodyTextClass()} font-medium transition-colors`;
  const barHeightClass = compact ? 'h-8' : 'h-9';

  return (
    <>
      <div
        ref={barRef}
        className={`flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-t px-2 ${barHeightClass} ${metadataTextClass()} border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)]`}
        role="toolbar"
        aria-label="Chart range"
        data-testid="chart-range-bar"
      >
        <div className="flex min-w-max items-center gap-0.5">
        {BOTTOM_RANGE_PRESETS.map((preset) => {
          const active = preset === selectedPreset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onRangeSelect(preset)}
              className={`${pillBaseClass} ${
                active
                  ? 'bg-[var(--edge-surface-active)] font-semibold text-[var(--edge-text-strong)]'
                  : 'text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]'
              }`}
              aria-pressed={active}
              data-testid={`chart-range-preset-${preset}`}
            >
              {rangePresetLabel(preset)}
            </button>
          );
        })}

        {onGoToClick && (
          <>
            <span
              className={headerDividerClass(theme)}
              aria-hidden
            />
            <button
              type="button"
              onClick={onGoToClick}
              className={`${compactControlClass()} edge-focus-ring inline-flex w-[var(--edge-control-height-compact)] items-center justify-center rounded-[var(--edge-radius-xs)] transition-colors hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]`}
              aria-label="Go to date"
              title="Go to date"
              data-testid="chart-range-go-to"
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
          className={`${pillBaseClass} ml-auto shrink-0 font-mono tabular-nums hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] ${
            menuOpen ? 'bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]' : ''
          }`}
          aria-label={`Chart timezone: ${clockLabel}. Click to change.`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Change timezone"
          data-testid="chart-range-clock"
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
