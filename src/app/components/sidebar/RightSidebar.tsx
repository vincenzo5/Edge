"use client";

import type { SidebarPanelId } from "@/lib/chartConfig";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import { resolveSidebarPanelMaxWidth } from "@/lib/responsive/sidebarWidth";
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
  const panelDef = activePanel ? SIDEBAR_PANEL_MAP[activePanel] : null;

  if (!panelDef || !activePanel || isFloating) {
    return null;
  }

  const resizeMaxWidth = resolveSidebarPanelMaxWidth(activePanel, viewportWidth, railWidth);

  return (
    <SidebarPanelShell
      panelId={panelDef.id}
      mode={mode}
      width={width}
      onWidthChange={onWidthChange}
      onClose={onClose}
      resizeMaxWidth={resizeMaxWidth}
      resizeMinWidth={LAYOUT_DIMENSIONS.sidebarPanelWidthMin}
    >
      <panelDef.Panel />
    </SidebarPanelShell>
  );
}

