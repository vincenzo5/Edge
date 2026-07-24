import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeEmptyState from "./EdgeEmptyState";

describe("EdgeEmptyState", () => {
  it("renders message and optional action", () => {
    render(
      <EdgeEmptyState
        message="No results yet."
        action={<button type="button">Retry</button>}
      />,
    );

    expect(screen.getByText("No results yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("supports alert role and title", () => {
    render(
      <EdgeEmptyState
        data-testid="empty"
        title="This chart encountered an error"
        message="Render failed"
        role="alert"
        tone="error"
      />,
    );

    const empty = screen.getByTestId("empty");
    expect(empty).toHaveAttribute("role", "alert");
    expect(screen.getByText("This chart encountered an error")).toBeInTheDocument();
    expect(screen.getByText("Render failed").className).toContain("text-[var(--edge-negative)]");
  });
});
