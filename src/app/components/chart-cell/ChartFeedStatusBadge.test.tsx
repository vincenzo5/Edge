import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChartFeedStatusBadge from "./ChartFeedStatusBadge";

describe("ChartFeedStatusBadge", () => {
  it("shows error status with retry when fetch failed with no candles", () => {
    const onRetry = vi.fn();

    render(
      <ChartFeedStatusBadge
        error="Network error"
        streamError={null}
        stale={false}
        refreshing={false}
        source="yahoo"
        onRetry={onRetry}
        showRetry
      />,
    );

    expect(screen.getByTestId("chart-feed-status-error")).toHaveTextContent(/Failed to load · yahoo/);
    fireEvent.click(screen.getByTestId("chart-feed-status-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows stream error over stale state", () => {
    render(
      <ChartFeedStatusBadge
        error={null}
        streamError="Stream disconnected"
        stale
        refreshing
        source="tws"
      />,
    );

    expect(screen.getByTestId("chart-feed-status-stream-error")).toHaveTextContent(
      /Stream interrupted · tws/,
    );
  });

  it("shows stale badge when data is stale", () => {
    render(
      <ChartFeedStatusBadge
        error={null}
        streamError={null}
        stale
        refreshing={false}
        source="mixed"
      />,
    );

    expect(screen.getByTestId("chart-feed-status-stale")).toHaveTextContent(/Stale data · mixed/);
  });

  it("shows refreshing badge when serving cached data", () => {
    render(
      <ChartFeedStatusBadge
        error={null}
        streamError={null}
        stale={false}
        refreshing
        source="yahoo"
      />,
    );

    expect(screen.getByTestId("chart-feed-status-refreshing")).toHaveTextContent(
      /Cached · refreshing · yahoo/,
    );
  });

  it("renders nothing when feed is healthy", () => {
    render(
      <ChartFeedStatusBadge
        error={null}
        streamError={null}
        stale={false}
        refreshing={false}
      />,
    );

    expect(screen.queryByTestId("chart-feed-status-badge")).toBeNull();
  });
});
