"use client";

import type { ChartDataMeta } from "@edge/chart-core";

export type ChartFeedStatusBadgeProps = {
  error: string | null;
  streamError: string | null;
  stale: boolean;
  refreshing: boolean;
  source?: ChartDataMeta["source"];
  onRetry?: () => void;
  showRetry?: boolean;
};

type ResolvedStatus = {
  testId: string;
  label: string;
  tone: "error" | "warning" | "muted";
};

function resolveStatus(props: ChartFeedStatusBadgeProps): ResolvedStatus | null {
  const sourceSuffix = props.source ? ` · ${props.source}` : "";

  if (props.error) {
    return {
      testId: "chart-feed-status-error",
      label: `Failed to load${sourceSuffix}`,
      tone: "error",
    };
  }
  if (props.streamError) {
    return {
      testId: "chart-feed-status-stream-error",
      label: `Stream interrupted${sourceSuffix}`,
      tone: "warning",
    };
  }
  if (props.stale) {
    return {
      testId: "chart-feed-status-stale",
      label: `Stale data${sourceSuffix}`,
      tone: "warning",
    };
  }
  if (props.refreshing) {
    return {
      testId: "chart-feed-status-refreshing",
      label: `Cached · refreshing${sourceSuffix}`,
      tone: "muted",
    };
  }
  return null;
}

function toneClass(tone: ResolvedStatus["tone"]): string {
  switch (tone) {
    case "error":
      return "text-[var(--edge-negative)] ring-[var(--edge-negative)]/30";
    case "warning":
      return "text-[var(--edge-warning)] ring-[var(--edge-warning)]/30";
    default:
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
  }
}

export default function ChartFeedStatusBadge(props: ChartFeedStatusBadgeProps) {
  const status = resolveStatus(props);
  if (!status) return null;

  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-20 flex max-w-[14rem] items-center gap-2"
      data-testid="chart-feed-status-badge"
    >
      <span
        data-testid={status.testId}
        className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${toneClass(status.tone)}`}
      >
        {status.label}
      </span>
      {props.showRetry && props.onRetry ? (
        <button
          type="button"
          data-testid="chart-feed-status-retry"
          onClick={props.onRetry}
          className="edge-focus-ring pointer-events-auto rounded px-2 py-0.5 text-[10px] font-medium text-[var(--edge-text-primary)] ring-1 ring-[var(--edge-border)]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
