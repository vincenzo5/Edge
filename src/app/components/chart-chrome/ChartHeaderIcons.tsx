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

export function OptionsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 5h12M2 8h12M2 11h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12.5" cy="11" r="1.5" fill="currentColor" />
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

/** Canonical closed-outline gear for settings actions across the app. */
export function SettingsIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-edge-icon="settings"
      aria-hidden
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.08A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.08A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"
      />
    </svg>
  );
}

/** Calculator icon for risk calculator rail. */
export function CalculatorIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <rect
        x="2.5"
        y="1.75"
        width="11"
        height="12.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 4.5h6M5 7h1.5M7.75 7H9.25M11.5 7H13M5 9.5h1.5M7.75 9.5H9.25M11.5 9.5H13M5 12h1.5M7.75 12H9.25M11.5 12H13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** @deprecated Use CalculatorIcon — kept for callers that still import RiskIcon. */
export function RiskIcon({ size = 16, className }: { size?: number; className?: string }) {
  return <CalculatorIcon size={size} className={className} />;
}

export function SunIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M11.5 10.5A5.2 5.2 0 015.5 4.5a5 5 0 105.9 5.9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export function LayoutSetupIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5" y="5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function QuickSearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 4.5l1.5 1.5M10.5 4v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function FullscreenIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SnapshotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 4l1.5-1.5h3L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v7M8 10l-2.5-2.5M8 10l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 12h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 11V3h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6.5 9.5l3-3M9 5.5l1.5-1.5a2 2 0 012.8 2.8L11 9M7 10.5L5.5 12a2 2 0 01-2.8-2.8L5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M6 3h7v7M13 3L6 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 6v7h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Pop a docked sidebar panel into a floating window. */
export function PanelPopOutIcon({ size = 14, className }: { size?: number; className?: string }) {
  return <ExternalLinkIcon size={size} className={className} />;
}

/** Dock a floating panel back into the right sidebar. */
export function PanelDockIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <rect
        x="2.5"
        y="3.5"
        width="7.5"
        height="9"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="10.5"
        y="3.5"
        width="3"
        height="9"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function FolderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 5h4l1.5 1.5H14V13H2V5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function CaptionIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 3.5h10a1 1 0 011 1v5a1 1 0 01-1 1H7l-2.5 2v-2H3a1 1 0 01-1-1v-5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M5 7h6M5 9.5h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M11 3l2 2-7 7H4v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5l3 3L13 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Header-sized pin for Copilot pinned panel toggle. */
export function PinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5.5 2.5h5l.5 3.5L13 8v1H3V8l2-2 .5-3.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 9v4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Header-sized trash matching Plus/Pencil/Settings (16×16 stroke icons). */
export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 4.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 4.5V3.5h4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M4.5 4.5l.6 8.5h6l.6-8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 6.5V10M7 4.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ScreenerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 3h12l-4.5 5v4L6.5 12V8L2 3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SyncIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13 8a5 5 0 0 1-8.9 3.1M3 8a5 5 0 0 1 8.9-3.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M3 11V8h3M13 5V8h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 10V3M8 3l-2.5 2.5M8 3l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M3 12h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export { CHART_TYPE_SECTION_ORDER, groupChartTypeMenu };
