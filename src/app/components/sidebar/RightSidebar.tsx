"use client";

import type { SidebarPanelId, Theme } from "@/lib/chartConfig";
import SidebarPanelShell from "./SidebarPanelShell";
import SidebarRail from "./SidebarRail";
import { SIDEBAR_PANEL_MAP } from "./registry";

type Props = {
  theme: Theme;
  activePanel: SidebarPanelId | null;
  onTogglePanel: (id: SidebarPanelId) => void;
  onClosePanel: () => void;
};

export default function RightSidebar({
  theme,
  activePanel,
  onTogglePanel,
  onClosePanel,
}: Props) {
  const panelDef = activePanel ? SIDEBAR_PANEL_MAP[activePanel] : null;
  const PanelComponent = panelDef?.Panel;

  return (
    <div className="flex h-full min-h-0 shrink-0 self-stretch">
      {panelDef && PanelComponent && (
        <SidebarPanelShell
          title={panelDef.label}
          panelId={panelDef.id}
          onClose={onClosePanel}
        >
          <PanelComponent />
        </SidebarPanelShell>
      )}
      <SidebarRail
        theme={theme}
        activePanel={activePanel}
        onTogglePanel={onTogglePanel}
      />
    </div>
  );
}
