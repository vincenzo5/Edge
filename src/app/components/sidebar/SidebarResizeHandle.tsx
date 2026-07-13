"use client";

import { useSidebarResize } from "./useSidebarResize";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";

type Props = {
  width: number;
  onWidthPreview: (width: number) => void;
  onWidthCommit: (width: number) => void;
  enabled?: boolean;
  maxWidth?: number;
  minWidth?: number;
};

export default function SidebarResizeHandle({
  width,
  onWidthPreview,
  onWidthCommit,
  enabled = true,
  maxWidth = LAYOUT_DIMENSIONS.sidebarPanelWidthMax,
  minWidth = LAYOUT_DIMENSIONS.sidebarPanelWidthMin,
}: Props) {
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyDown,
  } = useSidebarResize({
    width,
    onWidthPreview,
    onWidthCommit,
    enabled,
    maxWidth,
    minWidth,
  });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar panel"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabIndex={enabled ? 0 : -1}
      data-testid="sidebar-resize-handle"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      className={`absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize touch-none ${
        enabled
          ? "hover:bg-[var(--edge-accent-blue)] focus-visible:bg-[var(--edge-accent-blue)] focus-visible:outline-none"
          : "pointer-events-none opacity-0"
      }`}
    />
  );
}
