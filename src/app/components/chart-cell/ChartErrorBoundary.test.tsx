import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChartErrorBoundary from "./ChartErrorBoundary";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Chart render failed");
  }
  return <div data-testid="chart-child-ok">Chart OK</div>;
}

describe("ChartErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ChartErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId("chart-child-ok")).toBeInTheDocument();
  });

  it("shows fallback UI when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ChartErrorBoundary>
        <ThrowingChild shouldThrow />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId("chart-error-fallback")).toBeInTheDocument();
    expect(screen.getByText(/Chart render failed/)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("calls onRetry when Retry chart is clicked", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRetry = vi.fn();

    render(
      <ChartErrorBoundary onRetry={onRetry}>
        <ThrowingChild shouldThrow />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId("chart-error-fallback")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("chart-error-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("clears fallback when resetKey changes", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ChartErrorBoundary resetKey={0}>
        <ThrowingChild shouldThrow />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId("chart-error-fallback")).toBeInTheDocument();

    rerender(
      <ChartErrorBoundary resetKey={1}>
        <ThrowingChild shouldThrow={false} />
      </ChartErrorBoundary>,
    );

    expect(screen.getByTestId("chart-child-ok")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
