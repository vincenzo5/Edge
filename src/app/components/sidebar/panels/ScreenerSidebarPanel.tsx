"use client";

import { ScreenerPanelContent } from "../../screener/ScreenerPanelContent";

export function ScreenerSidebarPanel() {
  return (
    <div
      data-testid="screener-sidebar-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ScreenerPanelContent active variant="sidebar" />
    </div>
  );
}
