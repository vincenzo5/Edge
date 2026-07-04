import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeSpinner from "./EdgeSpinner";

describe("EdgeSpinner", () => {
  it("renders md spinner by default", () => {
    render(<EdgeSpinner data-testid="spinner" />);
    const spinner = screen.getByTestId("spinner");
    expect(spinner).toHaveClass("edge-spinner");
    expect(spinner).toHaveClass("h-8", "w-8", "border-2");
  });

  it("renders sm spinner when requested", () => {
    render(<EdgeSpinner size="sm" data-testid="spinner-sm" />);
    expect(screen.getByTestId("spinner-sm")).toHaveClass("h-4", "w-4", "border");
  });

  it("is aria-hidden decorative", () => {
    render(<EdgeSpinner data-testid="spinner" />);
    expect(screen.getByTestId("spinner")).toHaveAttribute("aria-hidden", "true");
  });
});
