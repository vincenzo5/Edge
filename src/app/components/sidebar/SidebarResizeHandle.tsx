"use client";

import { useSidebarResize } from "./useSidebarResize";

type Props = {
  width: number;
  onWidthPreview: (width: number) => void;
  onWidthCommit: (width: number) => void;
  enabled?: boolean;
};

export default function SidebarResizeHandle({
  width,
  onWidthPreview,
  onWidthCommit,
  enabled = true,
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
  });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar panel"
      aria-valuemin={260}
      aria-valuemax={560}
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
