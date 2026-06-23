'use client';

import { useMemo, useRef, useState } from 'react';
import type { Interval, Theme } from '@/lib/chartConfig';
import {
  INTERVAL_CATEGORY_LABELS,
  INTERVAL_MENU_CATEGORIES,
  groupIntervalMenu,
  intervalShortLabel,
} from '@/lib/chart/chartHeaderMetadata';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import ChartMenuSectionHeader from './ChartMenuSectionHeader';

type Props = {
  theme: Theme;
  value: Interval;
  onChange: (interval: Interval) => void;
};

export default function ChartIntervalMenu({ theme, value, onChange }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    ticks: true,
    seconds: true,
    minutes: false,
    hours: false,
    days: false,
  });

  const grouped = useMemo(() => groupIntervalMenu(), []);

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        label={intervalShortLabel(value)}
        active={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="chart-interval-trigger"
      />
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        onClose={() => setOpen(false)}
        minWidth={220}
      >
        <div className="border-b border-[var(--tv-border)] px-3 py-2 text-xs text-[var(--tv-text-secondary)]">Add custom interval...</div>
        {INTERVAL_MENU_CATEGORIES.map((category, idx) => {
          const items = grouped[category];
          const isCollapsed = collapsed[category] ?? false;
          return (
            <div key={category}>
              {idx > 0 ? (
                <div className="my-1 border-t border-[var(--tv-border-strong)]" />
              ) : null}
              <ChartMenuSectionHeader
                theme={theme}
                label={INTERVAL_CATEGORY_LABELS[category]}
                collapsed={isCollapsed}
                onToggle={() => toggleSection(category)}
              />
              {!isCollapsed &&
                items.map((item) => (
                  <ChartMenuItemRow
                    key={item.id}
                    theme={theme}
                    label={item.label}
                    selected={item.interval === value}
                    disabled={!item.implemented}
                    disabledReason={item.disabledReason}
                    onClick={() => {
                      if (item.interval) {
                        onChange(item.interval);
                        setOpen(false);
                      }
                    }}
                  />
                ))}
            </div>
          );
        })}
      </ChartAnchoredPopover>
    </>
  );
}
