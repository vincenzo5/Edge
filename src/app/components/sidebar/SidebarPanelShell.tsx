"use client";

import type { ReactNode } from "react";

type Props = {
  panelId: string;
  children: ReactNode;
};

export default function SidebarPanelShell({ panelId, children }: Props) {
  return (
    <div
      data-testid="sidebar-panel"
      data-panel-id={panelId}
      className="flex w-[280px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <div
        data-testid={`sidebar-panel-${panelId}`}
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </div>
    </div>
  );
}
