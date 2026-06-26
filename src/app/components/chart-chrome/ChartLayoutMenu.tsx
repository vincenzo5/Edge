'use client';

import { useRef, useState } from 'react';
import type { GridMode, Theme, LayoutSyncPrefs } from '@/lib/chartConfig';
import { GRID_MODES } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import ChartMenuSectionHeader from './ChartMenuSectionHeader';
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  FolderIcon,
  LayoutSetupIcon,
  PencilIcon,
  PlusIcon,
} from './ChartHeaderIcons';

type Props = {
  theme: Theme;
  layoutName?: string;
  gridMode: GridMode;
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  onGridModeChange: (mode: GridMode) => void;
  onLayoutSyncChange: (patch: Partial<LayoutSyncPrefs>) => void;
};

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${checked ? 'bg-[var(--edge-text-strong)]' : 'bg-[var(--edge-border-strong)]'}`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full bg-[var(--edge-background)] transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function GridModeIcon({ mode }: { mode: GridMode }) {
  const cells: boolean[] = (() => {
    switch (mode) {
      case '1x1':
        return [true];
      case '2x1':
        return [true, true];
      case '1x2':
        return [true, true];
      case '3x1':
        return [true, true, true];
      case '2x2':
        return [true, true, true, true];
    }
  })();

  const cols = mode === '1x2' || mode === '2x2' ? 2 : 1;
  const rows = mode === '2x1' || mode === '3x1' ? cells.length : mode === '2x2' ? 2 : 1;

  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
      {cells.map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const w = (18 - (cols - 1)) / cols;
        const h = (18 - (rows - 1)) / rows;
        const x = 1 + col * (w + 1);
        const y = 1 + row * (h + 1);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        );
      })}
    </svg>
  );
}

export default function ChartLayoutMenu({
  theme,
  layoutName = 'Default',
  gridMode,
  linkSymbol,
  linkInterval,
  linkCrosshair,
  linkDrawings,
  onGridModeChange,
  onLayoutSyncChange,
}: Props) {
  const setupRef = useRef<HTMLButtonElement>(null);
  const manageRef = useRef<HTMLButtonElement>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <ChartHeaderButton
        ref={setupRef}
        theme={theme}
        iconOnly
        active={setupOpen}
        title="Layout setup"
        onClick={() => setSetupOpen((o) => !o)}
        data-testid="layout-setup-trigger"
      >
        <LayoutSetupIcon />
      </ChartHeaderButton>

      <button
        ref={manageRef}
        type="button"
        onClick={() => setManageOpen((o) => !o)}
        className="edge-focus-ring inline-flex shrink-0 flex-col items-start rounded-[var(--edge-radius-sm)] px-1 py-0.5 text-left transition-colors hover:bg-[var(--edge-surface-hover)]"
        data-testid="layout-manage-trigger"
        aria-label="Manage layouts"
        title="Manage layouts"
      >
        <span className="inline-flex items-center gap-0.5 text-xs font-medium">
          {layoutName}
          <ChevronDownIcon />
        </span>
        <span className="text-[10px] text-[var(--edge-accent-blue)]">Save</span>
      </button>

      <ChartAnchoredPopover
        open={setupOpen}
        anchorRef={setupRef}
        theme={theme}
        onClose={() => setSetupOpen(false)}
        minWidth={280}
      >
        {GRID_MODES.map((mode, idx) => (
          <div key={mode.value}>
            {idx > 0 ? (
              <div className="my-1 border-t border-[var(--edge-border-strong)]" />
            ) : null}
            <div className="flex items-center gap-2 px-3 py-1">
              <span className="w-4 shrink-0 text-xs opacity-60">{mode.label}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onGridModeChange(mode.value);
                    setSetupOpen(false);
                  }}
                  className={`edge-focus-ring rounded-[var(--edge-radius-sm)] p-1 transition-colors ${
                    gridMode === mode.value
                      ? 'bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]'
                      : 'hover:bg-[var(--edge-surface-hover)]'
                  }`}
                  aria-label={`Layout ${mode.label}`}
                >
                  <GridModeIcon mode={mode.value} />
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="my-1 border-t border-[var(--edge-border-strong)]" />
        <ChartMenuSectionHeader theme={theme} label="SYNC IN LAYOUT" collapsed={false} />
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs">Symbol</span>
          <ToggleSwitch
            checked={linkSymbol}
            onChange={(v) => onLayoutSyncChange({ linkSymbol: v })}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs">Interval</span>
          <ToggleSwitch
            checked={linkInterval}
            onChange={(v) => onLayoutSyncChange({ linkInterval: v })}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs">Crosshair</span>
          <ToggleSwitch
            checked={linkCrosshair}
            onChange={(v) => onLayoutSyncChange({ linkCrosshair: v })}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs">Drawings</span>
          <ToggleSwitch
            checked={linkDrawings}
            onChange={(v) => onLayoutSyncChange({ linkDrawings: v })}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 opacity-40">
          <span className="text-xs">Time</span>
          <ToggleSwitch checked={false} disabled />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 opacity-40">
          <span className="text-xs">Date range</span>
          <ToggleSwitch checked={false} disabled />
        </div>
      </ChartAnchoredPopover>

      <ChartAnchoredPopover
        open={manageOpen}
        anchorRef={manageRef}
        theme={theme}
        onClose={() => setManageOpen(false)}
        minWidth={260}
      >
        <ChartMenuItemRow theme={theme} label="Save layout" trailing={<span className="opacity-50">⌘ S</span>} disabled disabledReason="Coming soon" />
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs">Autosave</span>
          <ToggleSwitch checked={true} disabled />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 opacity-40">
          <span className="inline-flex items-center gap-1 text-xs">
            Share layout
          </span>
          <ToggleSwitch checked={false} disabled />
        </div>
        <ChartMenuItemRow theme={theme} label="Make a copy..." icon={<CopyIcon size={14} />} disabled disabledReason="Coming soon" />
        <ChartMenuItemRow theme={theme} label="Rename..." icon={<PencilIcon size={14} />} disabled disabledReason="Coming soon" />
        <ChartMenuItemRow theme={theme} label="Download chart data..." icon={<DownloadIcon size={14} />} disabled disabledReason="Coming soon" />
        <div className="my-1 border-t border-[var(--edge-border-strong)]" />
        <ChartMenuItemRow theme={theme} label="Create new layout..." icon={<PlusIcon size={14} />} disabled disabledReason="Coming soon" />
        <ChartMenuSectionHeader theme={theme} label="RECENTLY USED" collapsed={false} />
        <ChartMenuItemRow theme={theme} label={layoutName} selected />
        <div className="my-1 border-t border-[var(--edge-border-strong)]" />
        <ChartMenuItemRow theme={theme} label="Open layout..." icon={<FolderIcon size={14} />} disabled disabledReason="Coming soon" />
      </ChartAnchoredPopover>
    </>
  );
}
