'use client';

import type { ReactNode } from 'react';
import type { Theme } from '@edge/chart-core';
import { PANE_COLLAPSED_HEIGHT } from '@edge/chart-core/panes';
import { PRICE_AXIS_WIDTH } from '@edge/chart-core/layout';

export const PANE_CONTROL_HEADER_HEIGHT = 44;

const PANE_ICON_SIZE = 16;
const PANE_ICON_SIZE_COLLAPSED = 12;

function paneButtonClass(compact: boolean): string {
  return compact
    ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-transparent bg-transparent text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]'
    : 'flex h-7 w-7 shrink-0 items-center justify-center rounded border border-transparent bg-transparent text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]';
}

type Props = {
  paneKey: string;
  theme: Theme;
  stackIndex: number;
  stackLength: number;
  isCollapsed: boolean;
  isMaximized: boolean;
  isPricePane: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onCollapse?: () => void;
  onMaximize?: () => void;
};

export default function PaneControlBar({
  stackIndex,
  stackLength,
  isCollapsed,
  isMaximized,
  isPricePane,
  onMoveUp,
  onMoveDown,
  onRemove,
  onCollapse,
  onMaximize,
}: Props) {
  void isPricePane;
  if (stackLength <= 1 && !isCollapsed) return null;

  const canMoveUp = stackIndex > 0;
  const canMoveDown = stackIndex < stackLength - 1;
  const canRemove = !isPricePane;
  const collapseLabel = isCollapsed ? 'Restore pane' : 'Collapse pane';
  const maximizeLabel = isMaximized ? 'Restore pane layout' : 'Maximize pane';

  const compact = isCollapsed;
  const iconSize = compact ? PANE_ICON_SIZE_COLLAPSED : PANE_ICON_SIZE;
  const headerHeight = compact ? PANE_COLLAPSED_HEIGHT : PANE_CONTROL_HEADER_HEIGHT;
  const buttonClass = paneButtonClass(compact);

  return (
    <div
      data-testid="pane-control-header"
      data-snapshot-exclude
      className="pointer-events-none absolute left-0 top-0 z-20"
      style={{ right: PRICE_AXIS_WIDTH, height: headerHeight }}
    >
      <div
        data-testid="pane-control-bar"
        className={`pointer-events-auto absolute right-1 flex items-center gap-0.5 ${
          compact
            ? 'top-1 opacity-100'
            : 'top-0.5 opacity-0 transition-opacity group-hover:opacity-100'
        }`}
      >
        {canMoveUp && onMoveUp && (
          <ControlButton label="Move pane up" onClick={onMoveUp} className={buttonClass} size={iconSize}>
            ↑
          </ControlButton>
        )}
        {canMoveDown && onMoveDown && (
          <ControlButton label="Move pane down" onClick={onMoveDown} className={buttonClass} size={iconSize}>
            ↓
          </ControlButton>
        )}
        {canRemove && onRemove && (
          <ControlButton label="Remove pane" onClick={onRemove} className={buttonClass} size={iconSize}>
            ×
          </ControlButton>
        )}
        {onCollapse && (
          <ControlButton label={collapseLabel} onClick={onCollapse} className={buttonClass} size={iconSize}>
            {isCollapsed ? '▢' : '−'}
          </ControlButton>
        )}
        {onMaximize && (
          <ControlButton label={maximizeLabel} onClick={onMaximize} className={buttonClass} size={iconSize}>
            {isMaximized ? '⊡' : '□'}
          </ControlButton>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  className,
  size,
  children,
}: {
  label: string;
  onClick?: () => void;
  className: string;
  size: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!onClick}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={className}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {children}
    </button>
  );
}
