import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeStatusRegion from "./EdgeStatusRegion";

describe("EdgeStatusRegion", () => {
  it("exposes status semantics and busy state", () => {
    render(
      <EdgeStatusRegion
        data-testid="status-region"
        label="Loading results…"
        description="Fetching from market data"
      />,
    );

    const region = screen.getByTestId("status-region");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-label", "Loading results…");
    expect(screen.getByTestId("status-region-label")).toHaveTextContent("Loading results…");
  });

  it("keeps spinner decorative", () => {
    render(<EdgeStatusRegion data-testid="status-region" label="Loading…" />);
    expect(screen.getByTestId("status-region-spinner")).toHaveAttribute("aria-hidden");
  });

  it("renders trailing content and children", () => {
    render(
      <EdgeStatusRegion
        data-testid="status-region"
        label="Running screen"
        trailing={<span data-testid="elapsed">12s</span>}
      >
        <div data-testid="skeleton">skeleton</div>
      </EdgeStatusRegion>,
    );

    expect(screen.getByTestId("elapsed")).toHaveTextContent("12s");
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });
});
