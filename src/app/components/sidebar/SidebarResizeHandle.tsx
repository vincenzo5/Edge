"use client";

import { useSidebarResize } from "./useSidebarResize";

type Props = {
  width: number;
  onWidthChange: (width: number) => void;
  enabled?: boolean;
};

export default function SidebarResizeHandle({ width, onWidthChange, enabled = true }: Props) {
  const { handlePointerDown, handleKeyDown } = useSidebarResize({
    width,
    onWidthChange,
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
      onKeyDown={handleKeyDown}
      className={`absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize touch-none ${
        enabled
          ? "hover:bg-[var(--edge-accent-blue)] focus-visible:bg-[var(--edge-accent-blue)] focus-visible:outline-none"
          : "pointer-events-none opacity-0"
      }`}
    />
  );
}
