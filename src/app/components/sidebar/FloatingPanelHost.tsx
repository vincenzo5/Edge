"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import type { FloatingPanelGeometry, SidebarPanelId, SidebarPrefs } from "@/lib/chartConfig";
import {
  defaultFloatingGeometry,
  getPanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import { usePresence } from "../design-system/usePresence";
import FloatingPanelShell from "./FloatingPanelShell";
import SidebarPanelLoading from "./SidebarPanelLoading";
import { SIDEBAR_PANEL_MAP } from "./registry";
import { OptionsFloatingPanel } from "./panels/OptionsFloatingPanel";

const ScreenerPanelContent = dynamic(
  () => import("../screener/ScreenerPanelContent").then((module) => ({ default: module.ScreenerPanelContent })),
  {
    ssr: false,
    loading: () => <SidebarPanelLoading label="Stock screener" />,
  },
);

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
  const presentation =
    activePanel != null ? getPanelPresentation(sidebar, activePanel) : "docked";
  const open = activePanel != null && presentation === "floating";
  const { mounted, visible } = usePresence(open);
  const lastPanelRef = useRef<SidebarPanelId | null>(null);
  if (activePanel != null) {
    lastPanelRef.current = activePanel;
  }
  const renderPanel = activePanel ?? lastPanelRef.current;

  if (!mounted || !renderPanel) return null;

  const panelDef = SIDEBAR_PANEL_MAP[renderPanel];
  const geometry =
    sidebar?.floatingGeometry?.[renderPanel] ?? defaultFloatingGeometry(renderPanel);

  const handleGeometryChange = (next: FloatingPanelGeometry) => {
    onGeometryChange(renderPanel, next);
  };

  const handleDock = () => onDock(renderPanel);

  if (renderPanel === "options") {
    return (
      <OptionsFloatingPanel
        geometry={geometry}
        onGeometryChange={handleGeometryChange}
        onDock={handleDock}
        onClose={onClose}
        visible={visible}
      />
    );
  }

  if (renderPanel === "screener") {
    return (
      <FloatingPanelShell
        panelId="screener"
        title={panelDef.label}
        geometry={geometry}
        onGeometryChange={handleGeometryChange}
        onDock={handleDock}
        onClose={onClose}
        visible={visible}
      >
        <ScreenerPanelContent active variant="floating" onClose={onClose} />
      </FloatingPanelShell>
    );
  }

  const Panel = panelDef.Panel;
  return (
    <FloatingPanelShell
      panelId={renderPanel}
      title={panelDef.label}
      geometry={geometry}
      onGeometryChange={handleGeometryChange}
      onDock={handleDock}
      onClose={onClose}
      visible={visible}
    >
      <Panel />
    </FloatingPanelShell>
  );
}
