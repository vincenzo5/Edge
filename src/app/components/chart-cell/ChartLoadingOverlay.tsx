"use client";

import type { Interval, Range } from "@/lib/chart/contracts";
import { INTERVALS } from "@/lib/chartConfig";
import { EdgeSkeletonLine, EdgeSpinner } from "../design-system";

type Props = {
  symbol: string;
  interval: Interval;
  range?: Range;
};

function formatIntervalLabel(interval: Interval): string {
  return INTERVALS.find((entry) => entry.value === interval)?.label ?? interval;
}

function SkeletonCandleBars({ count = 6 }: { count?: number }) {
  return (
    <div className="w-full max-w-md space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <EdgeSkeletonLine
          key={index}
          className="h-3"
          width={`${70 + (index % 3) * 10}%`}
        />
      ))}
    </div>
  );
}

export default function ChartLoadingOverlay({ symbol, interval, range: _range }: Props) {
  const trimmedSymbol = symbol.trim().toUpperCase() || "…";
  const intervalLabel = formatIntervalLabel(interval);
  const label = `Loading ${trimmedSymbol} · ${intervalLabel}…`;

  return (
    <div
      data-testid="chart-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--edge-surface-chart)] px-4 py-8"
    >
      <EdgeSpinner size="md" data-testid="chart-loading-spinner" />
      <div className="text-center">
        <div
          className="text-xs font-medium text-[var(--edge-text-strong)]"
          data-testid="chart-loading-label"
        >
          {label}
        </div>
        <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
          Fetching market data…
        </div>
      </div>
      <SkeletonCandleBars />
    </div>
  );
}
