"use client";

import type { Interval, Range } from "@edge/chart-core/contracts";
import { INTERVALS } from "@/lib/chartConfig";
import { EdgeStatusRegion } from "../design-system";
import SkeletonCandleBars from "./SkeletonCandleBars";

type Props = {
  symbol: string;
  interval: Interval;
  range?: Range;
};

function formatIntervalLabel(interval: Interval): string {
  return INTERVALS.find((entry) => entry.value === interval)?.label ?? interval;
}

export default function ChartLoadingOverlay({ symbol, interval, range: _range }: Props) {
  const trimmedSymbol = symbol.trim().toUpperCase() || "…";
  const intervalLabel = formatIntervalLabel(interval);
  const label = `Loading ${trimmedSymbol} · ${intervalLabel}…`;

  return (
    <EdgeStatusRegion
      data-testid="chart-loading-overlay"
      label={label}
      description="Fetching market data…"
      variant="panel"
      spinnerSize="md"
      className="absolute inset-0 z-20 bg-[var(--edge-surface-chart)]"
    >
      <SkeletonCandleBars />
    </EdgeStatusRegion>
  );
}
