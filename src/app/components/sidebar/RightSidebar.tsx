"use client";

import { useRef } from "react";
import type { SidebarPanelId } from "@/lib/chartConfig";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import { resolveSidebarPanelMaxWidth } from "@/lib/responsive/sidebarWidth";
import { usePresence } from "../design-system/usePresence";
import SidebarPanelShell from "./SidebarPanelShell";
import { SIDEBAR_PANEL_MAP } from "./registry";

type Props = {
  activePanel: SidebarPanelId | null;
  mode: SidebarMode;
  width: number;
  viewportWidth: number;
  railWidth?: number;
  isFloating?: boolean;
  onWidthChange?: (width: number) => void;
  onClose?: () => void;
};

export default function RightSidebar({
  activePanel,
  mode,
  width,
  viewportWidth,
  railWidth = LAYOUT_DIMENSIONS.sidebarRailWidth,
  isFloating = false,
  onWidthChange,
  onClose,
}: Props) {
  const open = activePanel != null && !isFloating;
  const { mounted, visible } = usePresence(open);
  const lastPanelRef = useRef<SidebarPanelId | null>(null);
  if (activePanel != null) {
    lastPanelRef.current = activePanel;
  }
  const renderPanel = activePanel ?? lastPanelRef.current;
  const panelDef = renderPanel ? SIDEBAR_PANEL_MAP[renderPanel] : null;

  if (!mounted || !panelDef || !renderPanel) {
    return null;
  }

  const resizeMaxWidth = resolveSidebarPanelMaxWidth(renderPanel, viewportWidth, railWidth);

  return (
    <SidebarPanelShell
      panelId={panelDef.id}
      mode={mode}
      width={width}
      visible={visible}
      onWidthChange={onWidthChange}
      onClose={onClose}
      resizeMaxWidth={resizeMaxWidth}
      resizeMinWidth={LAYOUT_DIMENSIONS.sidebarPanelWidthMin}
    >
      <panelDef.Panel />
    </SidebarPanelShell>
  );
}
