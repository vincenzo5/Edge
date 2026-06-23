"use client";

import type { CSSProperties } from "react";
import type { SidebarPanelId, Theme } from "@/lib/chartConfig";
import type { RailMode } from "@/lib/responsive/responsiveLayout";
import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import Tooltip from "../Tooltip";
import {
  toolbarButtonClass,
  toolbarButtonStateClass,
  toolbarRailWidthClass,
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
      className={`relative z-50 flex h-full shrink-0 flex-col items-center justify-start gap-1 self-stretch border-l border-[var(--tv-border)] bg-[var(--tv-surface-toolbar)] py-2 ${toolbarRailWidthClass(compact)}`}
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
              className={`${toolbarButtonClass(false)} ${toolbarButtonStateClass(active)}`}
            >
              <Icon className="h-5 w-5" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
