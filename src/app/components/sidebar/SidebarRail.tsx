"use client";

import type { SidebarPanelId, Theme } from "@/lib/chartConfig";
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
  onTogglePanel: (id: SidebarPanelId) => void;
};

export default function SidebarRail({
  theme,
  activePanel,
  onTogglePanel,
}: Props) {
  return (
    <div
      data-testid="sidebar-rail"
      className={`flex shrink-0 flex-col items-center gap-1 border-l border-gray-200 bg-white py-2 dark:border-gray-800 dark:bg-gray-950 ${toolbarRailWidthClass(false)}`}
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
