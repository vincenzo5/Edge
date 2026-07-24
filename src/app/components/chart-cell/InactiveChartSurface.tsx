"use client";

import SkeletonCandleBars from "./SkeletonCandleBars";

type Props = {
  symbol: string;
};

/** Lightweight placeholder while an inactive cell's chart engine is unmounted (Phase 11). */
export default function InactiveChartSurface({ symbol }: Props) {
  const label = symbol.trim().toUpperCase() || "…";

  return (
    <div
      data-testid="inactive-chart-surface"
      aria-hidden
      className="absolute inset-0 flex flex-col overflow-hidden bg-[var(--edge-surface-chart)]"
    >
      <div className="flex shrink-0 items-center px-3 py-2 text-xs text-[var(--edge-text-muted)]">
        {label}
      </div>
      <div className="relative min-h-0 flex-1 opacity-40">
        <SkeletonCandleBars />
      </div>
    </div>
  );
}
