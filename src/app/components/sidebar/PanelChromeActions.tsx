"use client";

import EdgeIconButton from "../design-system/EdgeIconButton";
import { PanelPopOutIcon } from "../chart-chrome/ChartHeaderIcons";
import { usePanelPresentation } from "./PanelPresentationContext";

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
