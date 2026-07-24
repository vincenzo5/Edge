"use client";

import { useMemo } from "react";
import type { Theme } from "@/lib/chartConfig";
import { buildDataHealthProjection, type ChartFeedOverlay } from "@/lib/marketData/healthProjection";
import DataHealthButton from "../data-health/DataHealthButton";
import { useDataHealth } from "../data-health/DataHealthProvider";

type Props = {
  theme: Theme;
  marketSessionLabel?: string | null;
  showMarketStatus?: boolean;
  chartFeed?: ChartFeedOverlay;
  showChartRetry?: boolean;
  onChartRetry?: () => void;
};

function overlayToneClass(tone: "error" | "warning" | "muted"): string {
  switch (tone) {
    case "error":
      return "text-[var(--edge-negative)] ring-[var(--edge-negative)]/30";
    case "warning":
      return "text-[var(--edge-warning)] ring-[var(--edge-warning)]/30";
    default:
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
  }
}

/** Chart top-right row: feed status chip + Data Health badge (no recover CTA). */
export default function ChartOverlayDataHealthRow({
  theme,
  marketSessionLabel = null,
  showMarketStatus = true,
  chartFeed,
  showChartRetry = false,
  onChartRetry,
}: Props) {
  const { snapshot } = useDataHealth();

  const projection = useMemo(() => {
    if (!chartFeed) return snapshot.projection;
    return buildDataHealthProjection(snapshot, { chartFeed });
  }, [chartFeed, snapshot]);

  return (
    <div
      className="pointer-events-auto flex max-w-[18rem] flex-col items-end gap-1"
      data-testid="chart-overlay-status-row"
    >
      {projection.overlayFeedStatus ? (
        <div className="pointer-events-none flex max-w-[14rem] items-center gap-2">
          <span
            data-testid={projection.overlayFeedStatus.testId}
            className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${overlayToneClass(projection.overlayFeedStatus.tone)}`}
          >
            {projection.overlayFeedStatus.label}
          </span>
          {showChartRetry && onChartRetry ? (
            <button
              type="button"
              data-testid="chart-feed-status-retry"
              onClick={onChartRetry}
              className="edge-focus-ring pointer-events-auto rounded px-2 py-0.5 text-[10px] font-medium text-[var(--edge-text-primary)] ring-1 ring-[var(--edge-border)]"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      <DataHealthButton
        theme={theme}
        marketSessionLabel={marketSessionLabel}
        showMarketStatus={showMarketStatus}
      />
    </div>
  );
}
