"use client";

import type { SidebarPanelId } from "@/lib/chartConfig";
import type { SidebarMode } from "@/lib/responsive/responsiveLayout";
import SidebarPanelShell from "./SidebarPanelShell";
import { SIDEBAR_PANEL_MAP } from "./registry";

type Props = {
  activePanel: SidebarPanelId | null;
  mode: SidebarMode;
  width: number;
  isFloating?: boolean;
  onWidthChange?: (width: number) => void;
  onClose?: () => void;
};

export default function RightSidebar({
  activePanel,
  mode,
  width,
  isFloating = false,
  onWidthChange,
  onClose,
}: Props) {
  const panelDef = activePanel ? SIDEBAR_PANEL_MAP[activePanel] : null;

  if (!panelDef || !activePanel || isFloating) {
    return null;
  }

  return (
    <SidebarPanelShell
      panelId={panelDef.id}
      mode={mode}
      width={width}
      onWidthChange={onWidthChange}
      onClose={onClose}
    >
      <panelDef.Panel />
    </SidebarPanelShell>
  );
}

