"use client";

import type { ComponentType } from "react";
import type { SidebarPanelId } from "@/lib/chartConfig";
import { ObjectTreePanel } from "./panels/ObjectTreePanel";
import { WatchlistSidebarPanel } from "./panels/WatchlistPanel";
import { AccountSidebarPanel } from "./panels/AccountSidebarPanel";
import { RiskSettingsSidebarPanel } from "./panels/RiskSettingsSidebarPanel";
import { OptionsSidebarPanel } from "./panels/OptionsPanel";
import { ScreenerSidebarPanel } from "./panels/ScreenerSidebarPanel";
import { TradeSidebarPanel } from "./panels/TradeSidebarPanel";
import { PatternsSidebarPanel } from "./panels/PatternsPanel";
import { CogIcon } from "../chart-chrome/ChartHeaderIcons";

export type SidebarPanelScope = "active-chart" | "app";

export type SidebarPanelDef = {
  id: SidebarPanelId;
  label: string;
  scope: SidebarPanelScope;
  Icon: ComponentType<{ className?: string }>;
  Panel: ComponentType;
  supportsPopOut?: boolean;
  floatingDefaults?: { width: number; height: number };
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

function OptionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 5h12M2 8h12M2 11h8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ScreenerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 3h12l-4.5 5v4L6.5 12V8L2 3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TradeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 12h12M4 8l4-5 4 5M8 3v9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function PatternsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 18V6l4 3 4-5 4 4 4-3v13H4z" />
      <path d="M8 14h8M8 10h5" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return <CogIcon className={className} />;
}

export const SIDEBAR_MAIN_PANELS: SidebarPanelDef[] = [
  {
    id: "watchlist",
    label: "Watchlist",
    scope: "app",
    Icon: WatchlistIcon,
    Panel: WatchlistSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 480, height: 400 },
  },
  {
    id: "options",
    label: "Options",
    scope: "active-chart",
    Icon: OptionsIcon,
    Panel: OptionsSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 920, height: 560 },
  },
  {
    id: "screener",
    label: "Stock screener",
    scope: "app",
    Icon: ScreenerIcon,
    Panel: ScreenerSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 1200, height: 700 },
  },
  {
    id: "patterns",
    label: "Patterns",
    scope: "app",
    Icon: PatternsIcon,
    Panel: PatternsSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 480, height: 560 },
  },
  {
    id: "object-tree",
    label: "Object tree",
    scope: "active-chart",
    Icon: ObjectTreeIcon,
    Panel: ObjectTreePanel,
    supportsPopOut: true,
    floatingDefaults: { width: 480, height: 400 },
  },
  {
    id: "trade",
    label: "Trade",
    scope: "active-chart",
    Icon: TradeIcon,
    Panel: TradeSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 400, height: 520 },
  },
  {
    id: "account",
    label: "Account",
    scope: "app",
    Icon: AccountIcon,
    Panel: AccountSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 480, height: 400 },
  },
];

export const SIDEBAR_FOOTER_PANELS: SidebarPanelDef[] = [
  {
    id: "settings",
    label: "Settings",
    scope: "app",
    Icon: SettingsIcon,
    Panel: RiskSettingsSidebarPanel,
    supportsPopOut: true,
    floatingDefaults: { width: 480, height: 400 },
  },
];

export const SIDEBAR_PANELS: SidebarPanelDef[] = [
  ...SIDEBAR_MAIN_PANELS,
  ...SIDEBAR_FOOTER_PANELS,
];

export const SIDEBAR_PANEL_MAP = Object.fromEntries(
  SIDEBAR_PANELS.map((panel) => [panel.id, panel]),
) as Record<SidebarPanelId, SidebarPanelDef>;
