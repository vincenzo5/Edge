import type { RefObject } from "react";
import { formatObjectTreeLabel } from "@/lib/chart/annotationMetadata";
import type { ObjectTreeDrawingRow } from "@/lib/chart/objectTreeModel";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  TrashIcon,
} from "../chart-icons/ChartToolIcons";
import { HoverIconButton, ICON_SIZE } from "./HoverIconButton";

export function ObjectTreeDrawingRow({
  cellIndex,
  drawing,
  isSelected,
  isEditing,
  editValue,
  editInputRef,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRemove,
  onBringForward,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  cellIndex: number;
  drawing: ObjectTreeDrawingRow;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRemove: () => void;
  onBringForward: (draggedId: string) => void;
  onStartRename: () => void;
  onEditValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  void cellIndex;
  const displayLabel = formatObjectTreeLabel(drawing.label || drawing.name, drawing.metadata);
  return (
    <div
      className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
        !drawing.visible ? "opacity-50" : ""
      } ${isSelected ? "bg-[var(--edge-surface-active)] ring-1 ring-inset ring-[var(--edge-border-strong)]" : ""}`}
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", drawing.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== drawing.id) {
          onBringForward(draggedId);
        }
      }}
    >
      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title={drawing.visible ? "Hide drawing" : "Show drawing"}
          onClick={onToggleVisible}
        >
          {drawing.visible ? (
            <EyeIcon size={ICON_SIZE} aria-hidden />
          ) : (
            <EyeOffIcon size={ICON_SIZE} aria-hidden />
          )}
        </HoverIconButton>
        <HoverIconButton
          title={drawing.locked ? "Unlock drawing" : "Lock drawing"}
          onClick={onToggleLocked}
          className={drawing.locked ? "text-orange-500" : ""}
        >
          <LockIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>

      {isEditing ? (
        <input
          ref={editInputRef}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
          className="min-w-0 flex-1 rounded border border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] px-1 py-0 text-xs text-[var(--edge-text-primary)]"
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-xs text-[var(--edge-text-primary)]"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          title="Double-click to rename"
        >
          {displayLabel}
        </span>
      )}

      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title="Remove drawing"
          onClick={onRemove}
          className="hover:text-[var(--edge-negative)]"
        >
          <TrashIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>
    </div>
  );
}
