"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import Tooltip from "./Tooltip";
import {
  CrosshairIcon,
  DeleteIcon,
  HideDrawingsIcon,
  KeepDrawingIcon,
  LockAllIcon,
  MagnetIcon,
  MeasureIcon,
  TrashIcon,
  ZoomInIcon,
} from "./chart-icons/ChartToolIcons";
import {
  DRAWING_TOOL_GROUPS,
  MEASURE_TOOL,
  findGroupForTool,
  initialGroupSelections,
  type DrawingToolName,
} from "./chart-icons/toolGroups";
import {
  toolbarButtonClass,
  toolbarButtonStateClass,
  toolbarIconSize,
  toolbarRailWidthClass,
} from "./chart-icons/toolbarButtonStyles";
import DrawingToolGroup from "./DrawingToolGroup";

type Props = {
  compact?: boolean;
  disabled?: boolean;
  theme: Theme;
  activeTool: string;
  magnet: boolean;
  keepDrawing: boolean;
  allLocked: boolean;
  allHidden: boolean;
  groupSelections: Record<string, DrawingToolName>;
  onGroupSelectionsChange: (next: Record<string, DrawingToolName>) => void;
  onToolSelect: (toolName: string) => void;
  onClear: () => void;
  onToggleMagnet: (on: boolean) => void;
  onToggleKeepDrawing: (on: boolean) => void;
  onToggleLockAll: () => void;
  onToggleHideAll: () => void;
  onZoomIn: () => void;
  onDeleteSelected?: () => void;
};

function Divider({ compact }: { compact: boolean }) {
  return (
    <div
      className={`my-1 h-px bg-[var(--app-border)] ${compact ? "w-10" : "w-12"}`}
    />
  );
}

function ToolButton({
  title,
  theme,
  active,
  disabled,
  compact,
  onClick,
  children,
}: {
  title: string;
  theme: Theme;
  active?: boolean;
  disabled?: boolean;
  compact: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={title} theme={theme} side="right" portaled>
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={`${toolbarButtonClass(compact)} ${toolbarButtonStateClass(active)}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export default function DrawingToolbar({
  compact = false,
  disabled = false,
  theme,
  activeTool,
  magnet,
  keepDrawing,
  allLocked,
  allHidden,
  groupSelections,
  onGroupSelectionsChange,
  onToolSelect,
  onClear,
  onToggleMagnet,
  onToggleKeepDrawing,
  onToggleLockAll,
  onToggleHideAll,
  onZoomIn,
  onDeleteSelected,
}: Props) {
  const iconSize = toolbarIconSize(compact);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null);

  // Sync group icon when parent activates a grouped tool (e.g. restore session).
  useEffect(() => {
    const group = findGroupForTool(activeTool);
    if (!group) return;
    const tool = activeTool as DrawingToolName;
    if (groupSelections[group.id] === tool) return;
    onGroupSelectionsChange({ ...groupSelections, [group.id]: tool });
  }, [activeTool, groupSelections, onGroupSelectionsChange]);

  const selectTool = (toolName: string) => {
    if (disabled) return;
    onToolSelect(toolName);
  };

  const selectFromGroup = (groupId: string, toolName: DrawingToolName) => {
    onGroupSelectionsChange({ ...groupSelections, [groupId]: toolName });
    selectTool(toolName);
  };

  return (
    <div
      className={`relative z-10 flex h-full shrink-0 flex-col items-center justify-start gap-0.5 overflow-visible border-r border-[var(--app-border)] bg-[var(--app-surface)] py-1.5 ${toolbarRailWidthClass(compact)} ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <ToolButton
        title="Cursor"
        theme={theme}
        active={activeTool === "__cursor__"}
        disabled={disabled}
        compact={compact}
        onClick={() => selectTool("__cursor__")}
      >
        <CrosshairIcon size={iconSize} />
      </ToolButton>

      {DRAWING_TOOL_GROUPS.map((group) => (
        <DrawingToolGroup
          key={group.id}
          theme={theme}
          group={group}
          selectedTool={groupSelections[group.id] ?? group.defaultTool}
          activeTool={activeTool}
          iconSize={iconSize}
          compact={compact}
          disabled={disabled}
          isOpen={openGroupId === group.id}
          isPinned={pinnedGroupId === group.id}
          onOpen={() => setOpenGroupId(group.id)}
          onClose={() => {
            setOpenGroupId((id) => (id === group.id ? null : id));
            setPinnedGroupId((id) => (id === group.id ? null : id));
          }}
          onPin={() => {
            setPinnedGroupId(group.id);
            setOpenGroupId(group.id);
          }}
          onUnpin={() => {
            setPinnedGroupId((id) => (id === group.id ? null : id));
          }}
          onSelect={(toolName) => selectFromGroup(group.id, toolName)}
        />
      ))}

      <Divider compact={compact} />

      <ToolButton
        title="Zoom in"
        theme={theme}
        disabled={disabled}
        compact={compact}
        onClick={onZoomIn}
      >
        <ZoomInIcon size={iconSize} />
      </ToolButton>

      <ToolButton
        title="Measure"
        theme={theme}
        active={activeTool === MEASURE_TOOL}
        disabled={disabled}
        compact={compact}
        onClick={() => selectTool(MEASURE_TOOL)}
      >
        <MeasureIcon size={iconSize} />
      </ToolButton>

      <Divider compact={compact} />

      <ToolButton
        title="Magnet mode (snap to OHLC)"
        theme={theme}
        active={magnet}
        disabled={disabled}
        compact={compact}
        onClick={() => onToggleMagnet(!magnet)}
      >
        <MagnetIcon size={iconSize} />
      </ToolButton>

      <ToolButton
        title="Stay in drawing mode"
        theme={theme}
        active={keepDrawing}
        disabled={disabled}
        compact={compact}
        onClick={() => onToggleKeepDrawing(!keepDrawing)}
      >
        <KeepDrawingIcon size={iconSize} />
      </ToolButton>

      <ToolButton
        title={allLocked ? "Unlock all drawings" : "Lock all drawings"}
        theme={theme}
        active={allLocked}
        disabled={disabled}
        compact={compact}
        onClick={onToggleLockAll}
      >
        <LockAllIcon size={iconSize} />
      </ToolButton>

      <ToolButton
        title={allHidden ? "Show all drawings" : "Hide all drawings"}
        theme={theme}
        active={allHidden}
        disabled={disabled}
        compact={compact}
        onClick={onToggleHideAll}
      >
        <HideDrawingsIcon size={iconSize} />
      </ToolButton>

      <Divider compact={compact} />

      {onDeleteSelected && (
        <ToolButton
          title="Delete selected drawing"
          theme={theme}
          disabled={disabled}
          compact={compact}
          onClick={onDeleteSelected}
        >
          <DeleteIcon size={iconSize} />
        </ToolButton>
      )}

      <ToolButton
        title="Remove all drawings"
        theme={theme}
        disabled={disabled}
        compact={compact}
        onClick={onClear}
      >
        <TrashIcon size={iconSize} />
      </ToolButton>
    </div>
  );
}

/** Default group selections merged with persisted prefs. */
export function resolveGroupSelections(
  persisted?: Record<string, DrawingToolName>,
): Record<string, DrawingToolName> {
  return { ...initialGroupSelections(), ...persisted };
}
