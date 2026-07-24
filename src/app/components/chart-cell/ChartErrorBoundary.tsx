"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { EdgeButton, EdgeEmptyState } from "../design-system";
import { reportLocalError } from "@/lib/observability/reportLocalError";

type Props = {
  children: ReactNode;
  resetKey?: number;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export default class ChartErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ChartErrorBoundary]", error, info.componentStack);
    reportLocalError({
      source: "chart",
      message: error.message || "Chart render failed",
      stack: error.stack,
      detail: info.componentStack ?? undefined,
    });
  }

  handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  handleCopyError = async (): Promise<void> => {
    const message = this.state.error?.message ?? "Unknown chart error";
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <EdgeEmptyState
          data-testid="chart-error-fallback"
          role="alert"
          title="This chart encountered an error"
          message={
            this.state.error.message || "Something went wrong while rendering this chart."
          }
          tone="error"
          className="min-h-0 flex-1 bg-[var(--edge-surface-panel)]"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <EdgeButton
                type="button"
                variant="secondary"
                data-testid="chart-error-retry"
                onClick={this.handleRetry}
              >
                Retry chart
              </EdgeButton>
              <EdgeButton
                type="button"
                variant="chrome"
                data-testid="chart-error-copy"
                onClick={() => void this.handleCopyError()}
              >
                Copy error
              </EdgeButton>
            </div>
          }
        />
      );
    }

    return this.props.children;
  }
}
