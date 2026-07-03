"use client";

import type { ChartDataMeta } from "@edge/chart-core";
import type { Theme } from "@/lib/chartConfig";
import DataHealthButton from "../data-health/DataHealthButton";
import ChartFeedStatusBadge, {
  type ChartFeedStatusBadgeProps,
} from "./ChartFeedStatusBadge";

type Props = ChartFeedStatusBadgeProps & {
  theme: Theme;
  showDataHealth?: boolean;
};

export default function ChartOverlayStatusStack({
  theme,
  showDataHealth = false,
  error,
  streamError,
  stale,
  refreshing,
  source,
  onRetry,
  showRetry,
}: Props) {
  if (!showDataHealth) {
    return (
      <ChartFeedStatusBadge
        error={error}
        streamError={streamError}
        stale={stale}
        refreshing={refreshing}
        source={source}
        onRetry={onRetry}
        showRetry={showRetry}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-30 flex flex-col items-end gap-1"
      data-testid="chart-overlay-status-stack"
    >
      <ChartFeedStatusBadge
        embedded
        error={error}
        streamError={streamError}
        stale={stale}
        refreshing={refreshing}
        source={source}
        onRetry={onRetry}
        showRetry={showRetry}
      />
      <div className="pointer-events-auto">
        <DataHealthButton theme={theme} />
      </div>
    </div>
  );
}
