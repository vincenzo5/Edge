import type { IndicatorConfig } from "@/lib/chart/contracts";
import {
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from "../chart-icons/ChartToolIcons";
import { HoverIconButton, ICON_SIZE } from "./HoverIconButton";

export function ObjectTreeIndicatorRow({
  indicator,
  onToggleVisible,
  onRemove,
}: {
  indicator: IndicatorConfig;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  const isVisible = indicator.visible !== false;
  return (
    <div
      className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
        !isVisible ? "opacity-50" : ""
      }`}
    >
      <HoverIconButton
        title={isVisible ? "Hide indicator" : "Show indicator"}
        onClick={onToggleVisible}
      >
        {isVisible ? (
          <EyeIcon size={ICON_SIZE} aria-hidden />
        ) : (
          <EyeOffIcon size={ICON_SIZE} aria-hidden />
        )}
      </HoverIconButton>
      <span className="min-w-0 flex-1 truncate text-[var(--edge-text-primary)]">
        {indicator.name}
      </span>
      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title={`Remove ${indicator.name}`}
          onClick={onRemove}
          className="hover:text-[var(--edge-negative)]"
        >
          <TrashIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>
    </div>
  );
}
