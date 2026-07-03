"use client";

import type { ComponentType } from "react";
import type { SidebarPanelId } from "@/lib/chartConfig";
import { ObjectTreePanel } from "./panels/ObjectTreePanel";
import { WatchlistSidebarPanel } from "./panels/WatchlistPanel";
import { AccountSidebarPanel } from "./panels/AccountSidebarPanel";
import { RiskSettingsSidebarPanel } from "./panels/RiskSettingsSidebarPanel";

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

function AccountIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 19V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14" />
      <path d="M8 9h8M8 13h5M8 17h3" />
    </svg>
  );
}

function RiskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M12 3v18M4 12h16" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export const SIDEBAR_PANELS: SidebarPanelDef[] = [
  {
    id: "watchlist",
    label: "Watchlist",
    scope: "app",
    Icon: WatchlistIcon,
    Panel: WatchlistSidebarPanel,
  },
  {
    id: "account",
    label: "Account",
    scope: "app",
    Icon: AccountIcon,
    Panel: AccountSidebarPanel,
  },
  {
    id: "risk",
    label: "Risk",
    scope: "app",
    Icon: RiskIcon,
    Panel: RiskSettingsSidebarPanel,
  },
  {
    id: "object-tree",
    label: "Object tree",
    scope: "active-chart",
    Icon: ObjectTreeIcon,
    Panel: ObjectTreePanel,
  },
];

export const SIDEBAR_PANEL_MAP = Object.fromEntries(
  SIDEBAR_PANELS.map((panel) => [panel.id, panel]),
) as Record<SidebarPanelId, SidebarPanelDef>;
