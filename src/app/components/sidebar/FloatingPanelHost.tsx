"use client";

import type { FloatingPanelGeometry, SidebarPanelId, SidebarPrefs } from "@/lib/chartConfig";
import {
  defaultFloatingGeometry,
  getPanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import { ScreenerPanelContent } from "../screener/ScreenerPanelContent";
import FloatingPanelShell from "./FloatingPanelShell";
import { SIDEBAR_PANEL_MAP } from "./registry";
import { OptionsFloatingPanel } from "./panels/OptionsFloatingPanel";

type Props = {
  activePanel: SidebarPanelId | null;
  sidebar: SidebarPrefs | undefined;
  onGeometryChange: (panelId: SidebarPanelId, geometry: FloatingPanelGeometry) => void;
  onDock: (panelId: SidebarPanelId) => void;
  onClose: () => void;
};

export default function FloatingPanelHost({
  activePanel,
  sidebar,
  onGeometryChange,
  onDock,
  onClose,
}: Props) {
  if (!activePanel) return null;

  const presentation = getPanelPresentation(sidebar, activePanel);
  if (presentation !== "floating") return null;

  const panelDef = SIDEBAR_PANEL_MAP[activePanel];
  const geometry =
    sidebar?.floatingGeometry?.[activePanel] ?? defaultFloatingGeometry(activePanel);

  const handleGeometryChange = (next: FloatingPanelGeometry) => {
    onGeometryChange(activePanel, next);
  };

  const handleDock = () => onDock(activePanel);

  if (activePanel === "options") {
    return (
      <OptionsFloatingPanel
        geometry={geometry}
        onGeometryChange={handleGeometryChange}
        onDock={handleDock}
        onClose={onClose}
      />
    );
  }

  if (activePanel === "screener") {
    return (
      <FloatingPanelShell
        panelId="screener"
        title={panelDef.label}
        geometry={geometry}
        onGeometryChange={handleGeometryChange}
        onDock={handleDock}
        onClose={onClose}
      >
        <ScreenerPanelContent active variant="floating" onClose={onClose} />
      </FloatingPanelShell>
    );
  }

  const Panel = panelDef.Panel;
  return (
    <FloatingPanelShell
      panelId={activePanel}
      title={panelDef.label}
      geometry={geometry}
      onGeometryChange={handleGeometryChange}
      onDock={handleDock}
      onClose={onClose}
    >
      <Panel />
    </FloatingPanelShell>
  );
}
