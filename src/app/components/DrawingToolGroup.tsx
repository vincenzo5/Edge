"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import {
  type DrawingToolName,
  type ToolGroup,
  getToolIcon,
} from "./chart-icons/toolGroups";
import {
  toolbarButtonClass,
  toolbarButtonStateClass,
} from "./chart-icons/toolbarButtonStyles";
import { usePointerCoarse } from "./chart-icons/usePointerCoarse";

type Props = {
  group: ToolGroup;
  selectedTool: DrawingToolName;
  activeTool: string;
  iconSize: number;
  compact?: boolean;
  disabled?: boolean;
  isOpen: boolean;
  isPinned: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onSelect: (toolName: DrawingToolName) => void;
};

export default function DrawingToolGroup({
  group,
  selectedTool,
  activeTool,
  iconSize,
  compact = false,
  disabled,
  isOpen,
  isPinned,
  onOpen,
  onClose,
  onPin,
  onUnpin,
  onSelect,
}: Props) {
  const coarse = usePointerCoarse();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const isGroupActive = group.tools.some((t) => t.name === activeTool);
  const displayTool = isGroupActive
    ? (activeTool as DrawingToolName)
    : selectedTool;
  const DisplayIcon = getToolIcon(displayTool);
  const activeItem = group.tools.find((t) => t.name === activeTool);
  const selectedItem = group.tools.find((t) => t.name === selectedTool);
  const buttonLabel =
    activeItem?.label ?? selectedItem?.label ?? group.label;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (coarse || isPinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(onClose, 120);
  }, [clearCloseTimer, coarse, isPinned, onClose]);

  const handleEnter = () => {
    if (coarse || disabled) return;
    clearCloseTimer();
    onOpen();
  };

  const handleSelect = (toolName: DrawingToolName) => {
    onSelect(toolName);
    onClose();
    onUnpin();
  };

  const handleGroupClick = () => {
    if (disabled) return;
    if (coarse) {
      if (isOpen) {
        onClose();
        onUnpin();
      } else {
        onPin();
        onOpen();
      }
      return;
    }
    onSelect(selectedTool);
  };

  const handleGroupKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (coarse || isPinned) {
        if (isOpen) {
          onClose();
          onUnpin();
        } else {
          onPin();
          onOpen();
        }
      } else {
        onSelect(selectedTool);
      }
    }
    if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const first = containerRef.current?.querySelector<HTMLElement>(
        '[role="menuitemradio"]',
      );
      first?.focus();
    }
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      onClose();
      onUnpin();
    }
  };

  // Dismiss pinned flyout on outside tap.
  useEffect(() => {
    if (!isPinned || !isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      onClose();
      onUnpin();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen, isPinned, onClose, onUnpin]);

  // Global Escape closes pinned flyout.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        onUnpin();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, onUnpin]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        title={buttonLabel}
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled}
        onClick={handleGroupClick}
        onKeyDown={handleGroupKeyDown}
        className={`${toolbarButtonClass(compact)} ${toolbarButtonStateClass(isGroupActive)}`}
      >
        <DisplayIcon size={iconSize} />
      </button>

      {isOpen && !disabled && (
        <div
          id={menuId}
          role="menu"
          aria-label={group.label}
          className="absolute left-full top-0 z-50 ml-1 min-w-[200px] overflow-hidden rounded border border-[#1e222d] bg-[#131722] py-1 shadow-lg"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="border-b border-[#1e222d] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#787b86]">
            {group.label}
          </div>
          {group.tools.map((tool) => {
            const Icon = getToolIcon(tool.name);
            const isActive = activeTool === tool.name;
            return (
              <button
                key={tool.name}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleSelect(tool.name)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-[#2a2e39] text-[#d1d4dc]"
                    : "text-[#d1d4dc] hover:bg-[#1e222d]"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#787b86]">
                  <Icon size={22} />
                </span>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
