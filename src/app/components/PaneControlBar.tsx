'use client';

import type { ReactNode } from 'react';
import type { Theme } from '@/lib/chartConfig';
import { PANE_COLLAPSED_HEIGHT } from '@/lib/chart/panes';
import { PRICE_AXIS_WIDTH } from '@/lib/chart/layout';
import Tooltip from './Tooltip';
import {
  PaneCollapseIcon,
  PaneMaximizeIcon,
  PaneMoveDownIcon,
  PaneMoveUpIcon,
  PaneRestoreIcon,
  PaneRestoreLayoutIcon,
  TrashIcon,
} from './chart-icons/ChartToolIcons';
import { toolbarButtonStateClass } from './chart-icons/toolbarButtonStyles';

/** Header strip height — controls stay above the plot, not over the price axis. */
export const PANE_CONTROL_HEADER_HEIGHT = 44;

const PANE_ICON_SIZE = 16;
const PANE_ICON_SIZE_COLLAPSED = 12;

function paneButtonClass(compact: boolean): string {
  return compact
    ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors'
    : 'flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors';
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
  theme,
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
  if (stackLength <= 1 && !isCollapsed) return null;

  const canMoveUp = stackIndex > 0;
  const canMoveDown = stackIndex < stackLength - 1;
  const canRemove = !isPricePane;
  const collapseLabel = isCollapsed ? 'Restore pane' : 'Collapse pane';
  const maximizeLabel = isMaximized ? 'Restore pane layout' : 'Maximize pane';

  const compact = isCollapsed;
  const iconSize = compact ? PANE_ICON_SIZE_COLLAPSED : PANE_ICON_SIZE;
  const headerHeight = compact ? PANE_COLLAPSED_HEIGHT : PANE_CONTROL_HEADER_HEIGHT;
  const buttonClass = `${paneButtonClass(compact)} ${toolbarButtonStateClass()}`;

  return (
    <div
      data-testid="pane-control-header"
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
          <ControlButton label="Move pane up" theme={theme} onClick={onMoveUp} className={buttonClass}>
            <PaneMoveUpIcon size={iconSize} aria-hidden />
          </ControlButton>
        )}

        {canMoveDown && onMoveDown && (
          <ControlButton label="Move pane down" theme={theme} onClick={onMoveDown} className={buttonClass}>
            <PaneMoveDownIcon size={iconSize} aria-hidden />
          </ControlButton>
        )}

        {canRemove && onRemove && (
          <ControlButton label="Remove pane" theme={theme} onClick={onRemove} className={buttonClass}>
            <TrashIcon size={iconSize} aria-hidden />
          </ControlButton>
        )}

        {onCollapse && (
          <ControlButton label={collapseLabel} theme={theme} onClick={onCollapse} className={buttonClass}>
            {isCollapsed ? (
              <PaneRestoreIcon size={iconSize} aria-hidden />
            ) : (
              <PaneCollapseIcon size={iconSize} aria-hidden />
            )}
          </ControlButton>
        )}

        {onMaximize && (
          <ControlButton label={maximizeLabel} theme={theme} onClick={onMaximize} className={buttonClass}>
            {isMaximized ? (
              <PaneRestoreLayoutIcon size={iconSize} aria-hidden />
            ) : (
              <PaneMaximizeIcon size={iconSize} aria-hidden />
            )}
          </ControlButton>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  theme,
  onClick,
  className,
  children,
}: {
  label: string;
  theme: Theme;
  onClick?: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label} theme={theme}>
      <button
        type="button"
        aria-label={label}
        disabled={!onClick}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClick) onClick();
        }}
        className={className}
      >
        {children}
      </button>
    </Tooltip>
  );
}
