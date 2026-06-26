"use client";

import type { CSSProperties } from "react";
import type { SidebarPanelId, Theme } from "@/lib/chartConfig";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import Tooltip from "../Tooltip";
import {
  iconRailButtonClass,
  iconRailIconClass,
  iconRailWidthClass,
  toolbarButtonStateClass,
} from "../chart-icons/toolbarButtonStyles";
import { SIDEBAR_PANELS } from "./registry";

type Props = {
  theme: Theme;
  activePanel: SidebarPanelId | null;
  railMode?: RailMode;
  onTogglePanel: (id: SidebarPanelId) => void;
};

export default function SidebarRail({
  theme,
  activePanel,
  railMode = "full",
  onTogglePanel,
}: Props) {
  const compact = railMode === "compact";
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
      className={`relative z-50 flex h-full shrink-0 flex-col items-stretch justify-start gap-0.5 self-stretch border-l border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-0.5 py-1.5 ${iconRailWidthClass(compact)}`}
    >
      {SIDEBAR_PANELS.map((panel) => {
        const active = activePanel === panel.id;
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
              <Icon className={iconRailIconClass(compact)} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
