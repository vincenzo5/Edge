"use client";

import type { SidebarPanelId } from "@/lib/chartConfig";
import SidebarPanelShell from "./SidebarPanelShell";
import { SIDEBAR_PANEL_MAP } from "./registry";

type Props = {
  activePanel: SidebarPanelId | null;
};

export default function RightSidebar({ activePanel }: Props) {
  const panelDef = activePanel ? SIDEBAR_PANEL_MAP[activePanel] : null;
  const PanelComponent = panelDef?.Panel;

  if (!panelDef || !PanelComponent) {
    return null;
  }

  return (
    <SidebarPanelShell panelId={panelDef.id}>
      <PanelComponent />
    </SidebarPanelShell>
  );
}
