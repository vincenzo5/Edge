"use client";

import type { ComponentType } from "react";
import type { SidebarPanelId } from "@/lib/chartConfig";
import { ObjectTreePanel } from "./panels/ObjectTreePanel";
import { WatchlistSidebarPanel } from "./panels/WatchlistPanel";

export type SidebarPanelScope = "active-chart" | "app";

export type SidebarPanelDef = {
  id: SidebarPanelId;
  label: string;
  scope: SidebarPanelScope;
  Icon: ComponentType<{ className?: string }>;
  Panel: ComponentType;
};

function ObjectTreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M6 4h12v4H6zM4 10h16v4H4zM8 16h8v4H8z" />
    </svg>
  );
}

function WatchlistIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M6 4h12v3H6zM6 9h12v12H6z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export const SIDEBAR_PANELS: SidebarPanelDef[] = [
  {
    id: "object-tree",
    label: "Object tree",
    scope: "active-chart",
    Icon: ObjectTreeIcon,
    Panel: ObjectTreePanel,
  },
  {
    id: "watchlist",
    label: "Watchlist",
    scope: "app",
    Icon: WatchlistIcon,
    Panel: WatchlistSidebarPanel,
  },
];

export const SIDEBAR_PANEL_MAP = Object.fromEntries(
  SIDEBAR_PANELS.map((panel) => [panel.id, panel]),
) as Record<SidebarPanelId, SidebarPanelDef>;
