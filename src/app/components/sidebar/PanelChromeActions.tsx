"use client";

import EdgeIconButton from "../design-system/EdgeIconButton";
import { PanelPopOutIcon } from "../chart-chrome/ChartHeaderIcons";
import { usePanelPresentation } from "./PanelPresentationContext";
import { useSidebarPanelWidth } from "./SidebarPanelWidthContext";

export function PanelPopOutButton({
  label = "Pop out",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const presentation = usePanelPresentation();
  if (!presentation?.canPopOut) return null;

  return (
    <EdgeIconButton
      type="button"
      data-testid="panel-pop-out"
      onClick={presentation.popOut}
      size="sm"
      className={className}
      aria-label={label}
      title={label}
    >
      <PanelPopOutIcon size={14} />
    </EdgeIconButton>
  );
}

export function PanelExpandButton({
  className,
}: {
  className?: string;
}) {
  const widthCtx = useSidebarPanelWidth();
  if (!widthCtx?.canExpand) return null;

  const label = widthCtx.isExpanded ? "Collapse panel" : "Expand panel";

  return (
    <EdgeIconButton
      type="button"
      data-testid={widthCtx.isExpanded ? "panel-collapse" : "panel-expand"}
      onClick={widthCtx.isExpanded ? widthCtx.collapse : widthCtx.expand}
      size="sm"
      className={className}
      aria-label={label}
      title={label}
    >
      <span className="text-[11px] font-medium leading-none" aria-hidden>
        {widthCtx.isExpanded ? "◧" : "◨"}
      </span>
    </EdgeIconButton>
  );
}
