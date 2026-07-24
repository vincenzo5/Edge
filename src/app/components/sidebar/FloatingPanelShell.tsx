"use client";

import { useEffect, type ReactNode } from "react";
import type { FloatingPanelGeometry, SidebarPanelId } from "@/lib/chartConfig";
import { PanelDockIcon } from "../chart-chrome/ChartHeaderIcons";
import EdgeIconButton from "../design-system/EdgeIconButton";
import { panelTitleClass } from "../design-system/styles";
import { useFloatingPanel } from "./useFloatingPanel";

type Props = {
  panelId: SidebarPanelId;
  title: string;
  geometry: FloatingPanelGeometry;
  onGeometryChange: (geometry: FloatingPanelGeometry) => void;
  onDock?: () => void;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  testId?: string;
};

export default function FloatingPanelShell({
  panelId,
  title,
  geometry,
  onGeometryChange,
  onDock,
  onClose,
  headerActions,
  children,
  testId,
}: Props) {
  const {
    panelRef,
    displayGeometry,
    handleHeaderPointerDown,
    handleHeaderPointerMove,
    handleHeaderPointerUp,
    handleHeaderPointerCancel,
    handleResizePointerDown,
  } = useFloatingPanel({ geometry, onGeometryChange });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      data-testid={testId ?? `floating-panel-${panelId}`}
      className="pointer-events-auto absolute z-40 flex flex-col overflow-hidden rounded-lg border border-[var(--edge-border-strong)] bg-[var(--edge-surface-popover)] shadow-2xl"
      style={{
        left: displayGeometry.x,
        top: displayGeometry.y,
        width: displayGeometry.width,
        height: displayGeometry.height,
        maxWidth: "calc(100% - 16px)",
        maxHeight: "calc(100% - 16px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        data-testid={`${testId ?? `floating-panel-${panelId}`}-header`}
        className="flex cursor-grab items-center justify-between border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-3 py-2 active:cursor-grabbing"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerCancel}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[var(--edge-text-muted)]" aria-hidden>
            ⠿
          </span>
          <span className={`truncate ${panelTitleClass(true)}`}>
            {title}
          </span>
          {headerActions ? <div data-no-drag>{headerActions}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1" data-no-drag>
          {onDock ? (
            <EdgeIconButton
              type="button"
              data-testid={`${testId ?? `floating-panel-${panelId}`}-dock`}
              onClick={onDock}
              size="compact"
              aria-label={`Dock ${title}`}
              title="Dock"
            >
              <PanelDockIcon size={14} />
            </EdgeIconButton>
          ) : null}
          <EdgeIconButton
            type="button"
            data-testid={`${testId ?? `floating-panel-${panelId}`}-close`}
            onClick={onClose}
            size="compact"
            aria-label={`Close ${title}`}
            title={`Close ${title}`}
          >
            ×
          </EdgeIconButton>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <div
        data-testid={`${testId ?? `floating-panel-${panelId}`}-resize`}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        aria-hidden
        onPointerDown={handleResizePointerDown}
      />
    </div>
  );
}
