"use client";

import type { ChartDataMeta } from "@edge/chart-core";
import type { Theme } from "@/lib/chartConfig";
import { PRICE_AXIS_WIDTH } from "@/lib/chart/layout";
import ChartOverlayDataHealthRow from "./ChartOverlayDataHealthRow";
import ChartFeedStatusBadge, {
  type ChartFeedStatusBadgeProps,
} from "./ChartFeedStatusBadge";

/** Gap between the price-axis strip and chart overlay chrome. */
const OVERLAY_AXIS_GAP_PX = 8;

type Props = ChartFeedStatusBadgeProps & {
  theme: Theme;
  showDataHealth?: boolean;
  marketSessionLabel?: string | null;
  showMarketStatus?: boolean;
};

export default function ChartOverlayStatusStack({
  theme,
  showDataHealth = false,
  marketSessionLabel = null,
  showMarketStatus = true,
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

  const overlayRightPx = PRICE_AXIS_WIDTH + OVERLAY_AXIS_GAP_PX;

  return (
    <div
      className="pointer-events-none absolute top-2 z-30 flex flex-col items-end gap-1"
      style={{ right: overlayRightPx }}
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
      <ChartOverlayDataHealthRow
        theme={theme}
        marketSessionLabel={marketSessionLabel}
        showMarketStatus={showMarketStatus}
      />
    </div>
  );
}
