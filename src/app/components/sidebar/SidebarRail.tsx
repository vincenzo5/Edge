"use client";

import type { CSSProperties } from "react";
import type { SidebarPanelId, Theme } from "@/lib/chartConfig";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import { countOpenPositions } from "@/lib/trading/openRiskSummary";
import { useAccountOptional } from "../AccountProvider";
import Tooltip from "../Tooltip";
import {
  iconRailButtonClass,
  iconRailIconClass,
  iconRailShellClass,
  toolbarButtonStateClass,
} from "../chart-icons/toolbarButtonStyles";
import { SIDEBAR_FOOTER_PANELS, SIDEBAR_MAIN_PANELS, type SidebarPanelDef } from "./registry";

type Props = {
  theme: Theme;
  activePanel: SidebarPanelId | null;
  railMode?: RailMode;
  onTogglePanel: (id: SidebarPanelId) => void;
};

function RailButton({
  panel,
  theme,
  active,
  compact,
  badgeCount,
  onTogglePanel,
}: {
  panel: SidebarPanelDef;
  theme: Theme;
  active: boolean;
  compact: boolean;
  badgeCount?: number;
  onTogglePanel: (id: SidebarPanelId) => void;
}) {
  const Icon = panel.Icon;
  return (
    <Tooltip key={panel.id} content={panel.label} theme={theme} side="left" portaled>
      <button
        type="button"
        data-testid={`sidebar-rail-${panel.id}`}
        aria-label={panel.label}
        aria-pressed={active}
        onClick={() => onTogglePanel(panel.id)}
        data-active={active ? "true" : "false"}
        className={`${iconRailButtonClass(compact)} ${toolbarButtonStateClass(active)}`}
      >
        <span className="relative inline-flex">
          <Icon className={iconRailIconClass(compact)} />
          {badgeCount != null && badgeCount > 0 ? (
            <span
              data-testid={`sidebar-rail-${panel.id}-badge`}
              className="absolute -right-1 -top-1 inline-flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--edge-accent-blue)] px-0.5 text-[9px] font-semibold leading-none text-white"
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </span>
      </button>
    </Tooltip>
  );
}

export default function SidebarRail({
  theme,
  activePanel,
  railMode = "full",
  onTogglePanel,
}: Props) {
  const compact = railMode === "compact";
  const account = useAccountOptional();
  const openPositionCount = account ? countOpenPositions(account.positions) : 0;
  const railWidth =
    railMode === "compact"
      ? LAYOUT_DIMENSIONS.compactSidebarRailWidth
      : LAYOUT_DIMENSIONS.sidebarRailWidth;

  return (
    <div
      data-testid="sidebar-rail"
      data-rail-mode={railMode}
      style={
        {
          "--sidebar-rail-width": `${railWidth}px`,
          width: railWidth,
        } as CSSProperties
      }
      className={iconRailShellClass(compact, "right")}
    >
      <div className="flex flex-col items-stretch gap-0.5">
        {SIDEBAR_MAIN_PANELS.map((panel) => (
          <RailButton
            key={panel.id}
            panel={panel}
            theme={theme}
            active={activePanel === panel.id}
            compact={compact}
            onTogglePanel={onTogglePanel}
          />
        ))}
      </div>
      <div className="min-h-2 flex-1" aria-hidden />
      <div className="flex flex-col items-stretch gap-0.5">
        {SIDEBAR_FOOTER_PANELS.map((panel) => (
          <RailButton
            key={panel.id}
            panel={panel}
            theme={theme}
            active={activePanel === panel.id}
            compact={compact}
            badgeCount={panel.id === "account" ? openPositionCount : undefined}
            onTogglePanel={onTogglePanel}
          />
        ))}
      </div>
    </div>
  );
}
