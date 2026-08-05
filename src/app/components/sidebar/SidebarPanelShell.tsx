"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import {
  sidebarPanelContentMotionClass,
  sidebarPanelShellMotionClass,
} from "../design-system/styles";
import { useFocusTrap } from "../design-system/useFocusTrap";
import SidebarResizeHandle from "./SidebarResizeHandle";
import { useSidebarPanelWidth } from "./SidebarPanelWidthContext";

type Props = {
  panelId: string;
  mode: SidebarMode;
  width: number;
  visible?: boolean;
  onWidthChange?: (width: number) => void;
  onClose?: () => void;
  resizeMaxWidth?: number;
  resizeMinWidth?: number;
  children: ReactNode;
};

export default function SidebarPanelShell({
  panelId,
  mode,
  width,
  visible = true,
  onWidthChange,
  onClose,
  resizeMaxWidth,
  resizeMinWidth,
  children,
}: Props) {
  const setWidthPreview = useSidebarPanelWidth()?.setWidthPreview;
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const displayWidth = draftWidth ?? width;
  const panelRef = useRef<HTMLDivElement>(null);
  const prevPanelIdRef = useRef(panelId);
  const [contentVisible, setContentVisible] = useState(true);

  useEffect(() => {
    setDraftWidth(null);
  }, [width]);

  useEffect(() => {
    if (prevPanelIdRef.current === panelId) return;
    prevPanelIdRef.current = panelId;
    setContentVisible(false);
    const frame = window.requestAnimationFrame(() => setContentVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [panelId]);

  const handleClose = useCallback(() => {
    if (!visible) return;
    onClose?.();
  }, [onClose, visible]);

  useFocusTrap(mode === "overlay", panelRef, { onEscape: handleClose });

  useEffect(() => {
    if (mode !== "overlay" || !onClose) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!visible) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose, visible]);

  const handleWidthPreview = useCallback(
    (nextWidth: number) => {
      setDraftWidth(nextWidth);
      setWidthPreview?.(nextWidth);
    },
    [setWidthPreview],
  );

  const handleWidthCommit = useCallback(
    (nextWidth: number) => {
      setDraftWidth(null);
      setWidthPreview?.(null);
      onWidthChange?.(nextWidth);
    },
    [onWidthChange, setWidthPreview],
  );

  return (
    <div
      ref={panelRef}
      data-testid="sidebar-panel"
      data-panel-id={panelId}
      data-sidebar-mode={mode}
      data-sidebar-visible={visible ? "true" : "false"}
      style={{ width: displayWidth }}
      className={`edge-panel flex shrink-0 flex-col overflow-hidden border-l ${sidebarPanelShellMotionClass(visible)} ${
        mode === "overlay"
          ? "absolute right-0 top-0 bottom-0 z-40 shadow-xl"
          : "relative h-full"
      }`}
    >
      {onWidthChange ? (
        <SidebarResizeHandle
          width={displayWidth}
          onWidthPreview={handleWidthPreview}
          onWidthCommit={handleWidthCommit}
          maxWidth={resizeMaxWidth}
          minWidth={resizeMinWidth}
        />
      ) : null}
      <div
        key={panelId}
        data-testid={`sidebar-panel-${panelId}`}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${sidebarPanelContentMotionClass(contentVisible)}`}
      >
        {children}
      </div>
    </div>
  );
}
