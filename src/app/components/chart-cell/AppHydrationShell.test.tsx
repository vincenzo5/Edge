import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppHydrationShell from "./AppHydrationShell";

describe("AppHydrationShell", () => {
  it("renders the hydration placeholder with accessibility attrs", () => {
    render(<AppHydrationShell />);
    const shell = screen.getByTestId("app-hydration-shell");
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute("role", "status");
    expect(shell).toHaveAttribute("aria-live", "polite");
    expect(shell).toHaveAttribute("aria-busy", "true");
  });

  it("renders structural skeleton regions", () => {
    render(<AppHydrationShell />);
    expect(screen.getByTestId("app-hydration-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-hydration-drawing-rail")).toBeInTheDocument();
    expect(screen.getByTestId("app-hydration-chart")).toBeInTheDocument();
    expect(screen.getByTestId("app-hydration-sidebar-rail")).toBeInTheDocument();
    expect(screen.getByTestId("app-hydration-range-bar")).toBeInTheDocument();
    expect(screen.getByTestId("app-hydration-spinner")).toBeInTheDocument();
  });

  it("shows generic boot copy without a symbol", () => {
    render(<AppHydrationShell />);
    expect(screen.getByText("Starting Edge…")).toBeInTheDocument();
    expect(screen.queryByText(/Loading AAPL/i)).toBeNull();
  });

  it("uses reduced-motion-safe spinner class", () => {
    render(<AppHydrationShell />);
    expect(screen.getByTestId("app-hydration-spinner")).toHaveClass("edge-spinner");
  });
});
