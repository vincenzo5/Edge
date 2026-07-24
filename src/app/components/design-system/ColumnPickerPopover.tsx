"use client";

import { useState, type DragEvent, type ReactNode, type RefObject } from "react";
import EdgeAnchoredPopover from "./EdgeAnchoredPopover";
import EdgeMenuItem from "./EdgeMenuItem";
import EdgeMenuSectionHeader from "./EdgeMenuSectionHeader";

export type ColumnPickerSection = {
  id: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    testId?: string;
  }>;
  maxHeightClass?: string;
};

type Props = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  sections: ColumnPickerSection[];
  onToggle: (sectionId: string, itemId: string) => void;
  onReset?: () => void;
  reorderable?: boolean;
  onReorder?: (sectionId: string, fromIndex: number, toIndex: number) => void;
  align?: "start" | "end";
  minWidth?: number;
  className?: string;
  panelClassName?: string;
  resetLabel?: string;
  enableMenuKeyboardNav?: boolean;
  footer?: ReactNode;
};

function DragHandleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0 text-[var(--edge-text-secondary)]"
      fill="currentColor"
    >
      <circle cx="4" cy="2.5" r="1" />
      <circle cx="8" cy="2.5" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9.5" r="1" />
      <circle cx="8" cy="9.5" r="1" />
    </svg>
  );
}

export default function ColumnPickerPopover({
  open,
  anchorRef,
  onClose,
  sections,
  onToggle,
  onReset,
  reorderable = false,
  onReorder,
  align = "end",
  minWidth = 220,
  className,
  panelClassName,
  resetLabel = "Reset to default",
  enableMenuKeyboardNav = false,
  footer,
}: Props) {
  const [dragging, setDragging] = useState<{ sectionId: string; index: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sectionId: string; index: number } | null>(null);

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    index: number,
  ) => {
    if (!reorderable || !onReorder) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDragging({ sectionId, index });
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    index: number,
  ) => {
    if (!reorderable || !onReorder || !dragging || dragging.sectionId !== sectionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragging.index !== index) {
      setDropTarget({ sectionId, index });
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    index: number,
  ) => {
    if (!reorderable || !onReorder || !dragging || dragging.sectionId !== sectionId) return;
    event.preventDefault();
    if (dragging.index !== index) {
      onReorder(sectionId, dragging.index, index);
    }
    setDragging(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropTarget(null);
  };

  return (
    <EdgeAnchoredPopover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      align={align}
      minWidth={minWidth}
      className={className}
      panelClassName={panelClassName}
      role="dialog"
      enableMenuKeyboardNav={enableMenuKeyboardNav}
    >
      {sections.map((section) => (
        <div key={section.id}>
          {section.label ? <EdgeMenuSectionHeader label={section.label} /> : null}
          <div className={`${section.maxHeightClass ?? ""} overflow-y-auto py-1`.trim()}>
            {section.items.map((item, index) => {
              const isDragging =
                dragging?.sectionId === section.id && dragging.index === index;
              const isDropTarget =
                dropTarget?.sectionId === section.id && dropTarget.index === index;

              return (
                <div
                  key={item.id}
                  draggable={reorderable && Boolean(onReorder)}
                  onDragStart={(event) => handleDragStart(event, section.id, index)}
                  onDragOver={(event) => handleDragOver(event, section.id, index)}
                  onDrop={(event) => handleDrop(event, section.id, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1 ${
                    isDragging ? "opacity-50" : ""
                  } ${isDropTarget ? "bg-[var(--edge-surface-panel)]" : ""}`}
                >
                  {reorderable && onReorder ? (
                    <span
                      className="flex cursor-grab items-center px-1 py-1 active:cursor-grabbing"
                      aria-hidden
                    >
                      <DragHandleIcon />
                    </span>
                  ) : null}
                  <label
                    className={`edge-menu-item edge-focus-ring flex flex-1 cursor-pointer items-center gap-2 ${
                      item.disabled ? "cursor-not-allowed opacity-40" : ""
                    }`}
                    data-testid={item.testId}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={item.disabled}
                      onChange={() => onToggle(section.id, item.id)}
                      aria-label={item.label}
                    />
                    <span className="truncate text-xs">{item.label}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {onReset ? (
        <EdgeMenuItem
          label={resetLabel}
          role="menuitem"
          onClick={() => {
            onReset();
            onClose();
          }}
        />
      ) : null}
      {footer}
    </EdgeAnchoredPopover>
  );
}
