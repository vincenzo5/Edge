'use client';

import { useMemo, useRef, useState } from 'react';
import type { ChartType, Theme } from '@/lib/chartConfig';
import { CHART_TYPE_MENU } from '@/lib/chart/chartHeaderMetadata';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import {
  CHART_TYPE_SECTION_ORDER,
  ChartTypeTriggerIcon,
  chartTypeIcon,
  groupChartTypeMenu,
} from './ChartHeaderIcons';

type Props = {
  theme: Theme;
  value: ChartType;
  onChange: (chartType: ChartType) => void;
};

export default function ChartTypeMenu({ theme, value, onChange }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => groupChartTypeMenu(), []);

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        iconOnly
        active={open}
        title="Chart type"
        onClick={() => setOpen((o) => !o)}
        data-testid="chart-type-trigger"
      >
        <ChartTypeTriggerIcon type={value} />
      </ChartHeaderButton>
      <ChartAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        theme={theme}
        onClose={() => setOpen(false)}
        minWidth={240}
      >
        {CHART_TYPE_SECTION_ORDER.map((section, sectionIdx) => {
          const items = grouped[section];
          if (items.length === 0) return null;
          return (
            <div key={section}>
              {sectionIdx > 0 ? (
                <div className="my-1 border-t border-[var(--edge-border-strong)]" />
              ) : null}
              {items.map((item) => (
                <ChartMenuItemRow
                  key={item.id}
                  theme={theme}
                  label={item.label}
                  selected={item.chartType === value}
                  disabled={!item.implemented}
                  disabledReason={item.disabledReason}
                  icon={chartTypeIcon(item.id as (typeof CHART_TYPE_MENU)[number]['id'])}
                  onClick={() => {
                    if (item.chartType) {
                      onChange(item.chartType);
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
