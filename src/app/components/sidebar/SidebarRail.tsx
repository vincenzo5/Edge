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
import { SIDEBAR_FOOTER_PANELS, SIDEBAR_MAIN_PANELS, type SidebarPanelDef } from "./registry";
import { MoonIcon, SunIcon } from "../chart-chrome/ChartHeaderIcons";

type Props = {
  theme: Theme;
  activePanel: SidebarPanelId | null;
  railMode?: RailMode;
  onTogglePanel: (id: SidebarPanelId) => void;
  onThemeChange: (theme: Theme) => void;
};

function RailButton({
  panel,
  theme,
  active,
  compact,
  onTogglePanel,
}: {
  panel: SidebarPanelDef;
  theme: Theme;
  active: boolean;
  compact: boolean;
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
        <Icon className={iconRailIconClass(compact)} />
      </button>
    </Tooltip>
  );
}

export default function SidebarRail({
  theme,
  activePanel,
  railMode = "full",
  onTogglePanel,
  onThemeChange,
}: Props) {
  const compact = railMode === "compact";
  const railWidth =
    railMode === "compact"
      ? LAYOUT_DIMENSIONS.compactSidebarRailWidth
      : LAYOUT_DIMENSIONS.sidebarRailWidth;
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

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
      className={`relative z-50 flex h-full shrink-0 flex-col items-stretch self-stretch border-l border-[var(--edge-border)] bg-[var(--edge-surface-rail)] px-0.5 py-1.5 ${iconRailWidthClass(compact)}`}
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
        <Tooltip content={themeLabel} theme={theme} side="left" portaled>
          <button
            type="button"
            data-testid="sidebar-rail-theme-toggle"
            aria-label={themeLabel}
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            className={iconRailButtonClass(compact)}
          >
            {theme === "dark" ? (
              <SunIcon className={iconRailIconClass(compact)} />
            ) : (
              <MoonIcon className={iconRailIconClass(compact)} />
            )}
          </button>
        </Tooltip>
        {SIDEBAR_FOOTER_PANELS.map((panel) => (
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
    </div>
  );
}
