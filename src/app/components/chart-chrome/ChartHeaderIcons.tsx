'use client';

import type { ChartType, Theme } from '@/lib/chartConfig';
import {
  CHART_TYPE_SECTION_ORDER,
  CHART_TYPE_MENU,
  groupChartTypeMenu,
} from '@/lib/chart/chartHeaderMetadata';

type Props = {
  type: ChartType | 'volume_candles' | 'line' | 'line_markers' | 'step_line';
  size?: number;
};

function CandleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="4" width="2" height="8" fill="currentColor" />
      <rect x="7" y="2" width="2" height="12" fill="currentColor" />
      <rect x="11" y="5" width="2" height="6" fill="currentColor" />
    </svg>
  );
}

function BarsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 4v8M3 4h2M3 12h2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 2v12M7 2h2M7 14h2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 6v6M11 6h2M11 12h2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function AreaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 12L5 8L8 10L14 4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 12L5 8L8 10L14 4V12H2Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function LineIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 11L6 7L9 9L14 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function chartTypeIcon(type: ChartTypeMenuItemId, size = 16) {
  switch (type) {
    case 'ohlc':
      return <BarsIcon size={size} />;
    case 'candle_solid':
    case 'candle_stroke':
    case 'heikin_ashi':
    case 'volume_candles':
      return <CandleIcon size={size} />;
    case 'area':
      return <AreaIcon size={size} />;
    default:
      return <LineIcon size={size} />;
  }
}

type ChartTypeMenuItemId = (typeof CHART_TYPE_MENU)[number]['id'];

export function ChartTypeTriggerIcon({ type, size = 16 }: Props) {
  const id = CHART_TYPE_MENU.find((item) => item.chartType === type)?.id ?? 'candle_solid';
  return chartTypeIcon(id as ChartTypeMenuItemId, size);
}

export function IndicatorsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 12L6 6L9 9L14 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 2h2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function TemplateGridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="9" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 2V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 2l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ReplayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h8M3 8l3-3M3 8l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 8h-8M13 8l-3-3M13 8l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function UndoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6h6a3 3 0 010 6H8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M6 4L4 6l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function RedoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M12 6H6a3 3 0 000 6h2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M10 4l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export { CHART_TYPE_SECTION_ORDER, groupChartTypeMenu };
