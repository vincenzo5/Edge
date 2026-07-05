"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { Theme } from "@/lib/chartConfig";
import Tooltip from "./Tooltip";
import {
  type DrawingToolName,
  type ToolGroup,
  getToolIcon,
} from "./chart-icons/toolGroups";
import {
  iconRailButtonClass,
  toolbarButtonStateClass,
} from "./chart-icons/toolbarButtonStyles";
import { usePointerCoarse } from "./chart-icons/usePointerCoarse";

type Props = {
  theme: Theme;
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

function flyoutPanelStyle(rect: DOMRect): CSSProperties {
  return {
    position: "fixed",
    top: rect.top,
    left: rect.right + 4,
    zIndex: 10_000,
  };
}

export default function DrawingToolGroup({
  theme,
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
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties | null>(null);
  const hasMultipleTools = group.tools.length > 1;

  const isGroupActive = group.tools.some((t) => t.name === activeTool);
  const displayTool = isGroupActive
    ? (activeTool as DrawingToolName)
    : selectedTool;
  const DisplayIcon = getToolIcon(displayTool);
  const activeItem = group.tools.find((t) => t.name === activeTool);
  const selectedItem = group.tools.find((t) => t.name === selectedTool);
  const defaultItem = group.tools.find((t) => t.name === group.defaultTool);
  const buttonLabel =
    activeItem?.label ?? selectedItem?.label ?? defaultItem?.label ?? group.label;
  const groupTooltip = `${group.label} — ${buttonLabel}`;

  const updateFlyoutPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setFlyoutStyle(flyoutPanelStyle(el.getBoundingClientRect()));
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    if (coarse || isPinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(onClose, 120);
  }, [clearCloseTimer, coarse, isPinned, onClose]);

  const toggleFlyout = useCallback(() => {
    if (isOpen) {
      onClose();
      onUnpin();
      return;
    }
    onPin();
    onOpen();
  }, [isOpen, onClose, onOpen, onPin, onUnpin]);

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
    if (coarse || hasMultipleTools) {
      toggleFlyout();
      return;
    }
    onSelect(selectedTool);
  };

  const handleGroupKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (coarse || hasMultipleTools) {
        toggleFlyout();
      } else {
        onSelect(selectedTool);
      }
    }
    if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const first = document.getElementById(menuId)?.querySelector<HTMLElement>(
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

  useLayoutEffect(() => {
    if (!isOpen) {
      setFlyoutStyle(null);
      return;
    }
    updateFlyoutPosition();
    const onLayoutChange = () => updateFlyoutPosition();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [isOpen, updateFlyoutPosition]);

  // Dismiss pinned flyout on outside tap.
  useEffect(() => {
    if (!isPinned || !isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      onClose();
      onUnpin();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen, isPinned, menuId, onClose, onUnpin]);

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

  const flyoutPanel =
    isOpen && !disabled ? (
      <div
        id={menuId}
        role="menu"
        aria-label={group.label}
        className="min-w-[200px] overflow-hidden rounded border border-[#1e222d] bg-[#131722] py-1 shadow-lg"
        style={flyoutStyle ?? { visibility: "hidden" }}
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
            <Tooltip
              key={tool.name}
              content={tool.label}
              theme={theme}
              side="right"
              portaled
              className="block w-full"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                aria-label={tool.label}
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
            </Tooltip>
          );
        })}
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleClose}
    >
      <Tooltip content={groupTooltip} theme={theme} side="right" portaled>
        <button
          type="button"
          aria-label={groupTooltip}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          disabled={disabled}
          onClick={handleGroupClick}
          onKeyDown={handleGroupKeyDown}
          className={`relative ${iconRailButtonClass(compact)} ${toolbarButtonStateClass(isGroupActive)}`}
        >
          <DisplayIcon size={iconSize} />
          {hasMultipleTools ? (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0.5 right-0.5 text-[9px] leading-none text-[var(--edge-text-rail)] opacity-80"
            >
              ▸
            </span>
          ) : null}
        </button>
      </Tooltip>

      {flyoutPanel && typeof document !== "undefined"
        ? createPortal(flyoutPanel, document.body)
        : null}
    </div>
  );
}
