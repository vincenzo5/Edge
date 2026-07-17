'use client';

import { useRef, useState } from 'react';
import type { LayoutTemplateId, Theme, LayoutSyncPrefs } from '@/lib/chartConfig';
import { LAYOUT_MENU_ROWS, templatesForPaneCount } from '@/lib/chartConfig';
import ChartAnchoredPopover from './ChartAnchoredPopover';
import ChartHeaderButton from './ChartHeaderButton';
import ChartMenuItemRow from './ChartMenuItemRow';
import ChartMenuSectionHeader from './ChartMenuSectionHeader';
import LayoutTemplateIcon from './LayoutTemplateIcon';
import {
  ChevronDownIcon,
  DownloadIcon,
  FolderIcon,
  LayoutSetupIcon,
  PencilIcon,
} from './ChartHeaderIcons';

type Props = {
  theme: Theme;
  layoutName?: string;
  layoutId: LayoutTemplateId;
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  onLayoutChange: (id: LayoutTemplateId) => void;
  onLayoutSyncChange: (patch: Partial<LayoutSyncPrefs>) => void;
  onRenameLayout?: () => void;
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

export default function ChartLayoutMenu({
  theme,
  layoutName = 'Default',
  layoutId,
  linkSymbol,
  linkInterval,
  linkCrosshair,
  linkDrawings,
  onLayoutChange,
  onLayoutSyncChange,
  onRenameLayout,
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
        {LAYOUT_MENU_ROWS.map((paneCount, idx) => {
          const templates = templatesForPaneCount(paneCount);
          return (
            <div key={paneCount}>
              {idx > 0 ? (
                <div className="my-1 border-t border-[var(--edge-border-strong)]" />
              ) : null}
              <div className="flex items-center gap-2 px-3 py-1">
                <span className="w-4 shrink-0 text-xs opacity-60">{paneCount}</span>
                <div className="flex flex-wrap gap-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        onLayoutChange(template.id);
                        setSetupOpen(false);
                      }}
                      className={`edge-focus-ring rounded-[var(--edge-radius-sm)] p-1 transition-colors ${
                        layoutId === template.id
                          ? 'bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]'
                          : 'hover:bg-[var(--edge-surface-hover)]'
                      }`}
                      aria-label={`Layout ${paneCount} ${template.id}`}
                      data-testid={`layout-template-${template.id}`}
                    >
                      <LayoutTemplateIcon template={template} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
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
        <ChartMenuItemRow
          theme={theme}
          label="Rename..."
          icon={<PencilIcon size={14} />}
          disabled={!onRenameLayout}
          disabledReason={onRenameLayout ? undefined : 'Coming soon'}
          onClick={() => {
            onRenameLayout?.();
            setManageOpen(false);
          }}
        />
        <ChartMenuItemRow theme={theme} label="Download chart data..." icon={<DownloadIcon size={14} />} disabled disabledReason="Coming soon" />
        <div className="my-1 border-t border-[var(--edge-border-strong)]" />
        <ChartMenuItemRow theme={theme} label="Open layout..." icon={<FolderIcon size={14} />} disabled disabledReason="Coming soon" />
      </ChartAnchoredPopover>
    </>
  );
}
