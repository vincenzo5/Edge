"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import SidebarResizeHandle from "./SidebarResizeHandle";

type Props = {
  panelId: string;
  mode: SidebarMode;
  width: number;
  onWidthChange?: (width: number) => void;
  onClose?: () => void;
  children: ReactNode;
};

export default function SidebarPanelShell({
  panelId,
  mode,
  width,
  onWidthChange,
  onClose,
  children,
}: Props) {
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const displayWidth = draftWidth ?? width;

  useEffect(() => {
    setDraftWidth(null);
  }, [width]);

  const handleWidthPreview = useCallback((nextWidth: number) => {
    setDraftWidth(nextWidth);
  }, []);

  const handleWidthCommit = useCallback(
    (nextWidth: number) => {
      setDraftWidth(null);
      onWidthChange?.(nextWidth);
    },
    [onWidthChange],
  );

  useEffect(() => {
    if (mode !== "overlay" || !onClose) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  const panel = (
    <div
      data-testid="sidebar-panel"
      data-panel-id={panelId}
      data-sidebar-mode={mode}
      style={{ width: displayWidth }}
      className={`edge-panel relative flex shrink-0 flex-col overflow-hidden border-l ${
        mode === "overlay"
          ? "fixed right-[var(--sidebar-rail-width,44px)] top-0 z-40 h-full shadow-xl"
          : "relative h-full"
      }`}
    >
      {onWidthChange ? (
        <SidebarResizeHandle
          width={displayWidth}
          onWidthPreview={handleWidthPreview}
          onWidthCommit={handleWidthCommit}
        />
      ) : null}
      <div
        data-testid={`sidebar-panel-${panelId}`}
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </div>
    </div>
  );

  if (mode === "overlay") {
    return (
      <>
        <button
          type="button"
          aria-label="Close sidebar panel"
          data-testid="sidebar-overlay-backdrop"
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onClose}
        />
        {panel}
      </>
    );
  }

  return panel;
}
