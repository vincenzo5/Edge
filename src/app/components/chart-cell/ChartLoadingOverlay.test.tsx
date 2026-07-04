import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChartLoadingOverlay from "./ChartLoadingOverlay";

describe("ChartLoadingOverlay", () => {
  it("renders symbol-aware loading label", () => {
    render(<ChartLoadingOverlay symbol="nvda" interval="1d" range="1y" />);
    expect(screen.getByTestId("chart-loading-label")).toHaveTextContent(
      "Loading NVDA · 1D…",
    );
  });

  it("exposes busy status for assistive tech", () => {
    render(<ChartLoadingOverlay symbol="AAPL" interval="5m" />);
    const overlay = screen.getByTestId("chart-loading-overlay");
    expect(overlay).toHaveAttribute("role", "status");
    expect(overlay).toHaveAttribute("aria-busy", "true");
    expect(overlay).toHaveAttribute("aria-live", "polite");
  });

  it("renders spinner and skeleton bars", () => {
    render(<ChartLoadingOverlay symbol="MSFT" interval="1h" />);
    expect(screen.getByTestId("chart-loading-spinner")).toBeInTheDocument();
    expect(screen.getByText("Fetching market data…")).toBeInTheDocument();
  });
});
