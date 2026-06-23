"use client";

import { useEffect, type ReactNode } from "react";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";

type Props = {
  panelId: string;
  mode: SidebarMode;
  onClose?: () => void;
  children: ReactNode;
};

export default function SidebarPanelShell({
  panelId,
  mode,
  onClose,
  children,
}: Props) {
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
      style={{ width: LAYOUT_DIMENSIONS.sidebarPanelWidth }}
      className={`tv-panel flex shrink-0 flex-col overflow-hidden border-l ${
        mode === "overlay"
          ? "fixed right-[var(--sidebar-rail-width,60px)] top-0 z-40 h-full shadow-xl"
          : "relative h-full"
      }`}
    >
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
