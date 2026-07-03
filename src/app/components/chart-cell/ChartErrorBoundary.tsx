"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

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
        <div
          data-testid="chart-error-fallback"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[var(--edge-surface-panel)] px-4 py-6 text-center"
        >
          <p className="text-sm font-medium text-[var(--edge-text-primary)]">
            This chart encountered an error
          </p>
          <p className="max-w-sm text-xs text-[var(--edge-text-muted)]">
            {this.state.error.message || "Something went wrong while rendering this chart."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              data-testid="chart-error-retry"
              onClick={this.handleRetry}
              className="edge-focus-ring rounded px-3 py-1.5 text-xs font-medium text-[var(--edge-text-primary)] ring-1 ring-[var(--edge-border)]"
            >
              Retry chart
            </button>
            <button
              type="button"
              data-testid="chart-error-copy"
              onClick={() => void this.handleCopyError()}
              className="edge-focus-ring rounded px-3 py-1.5 text-xs text-[var(--edge-text-muted)] ring-1 ring-[var(--edge-border)]"
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
