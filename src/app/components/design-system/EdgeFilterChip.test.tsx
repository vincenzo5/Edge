import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EdgeFilterChip from "./EdgeFilterChip";

describe("EdgeFilterChip", () => {
  it("renders static chips as non-interactive spans", () => {
    render(<EdgeFilterChip label="Price > $5" data-testid="chip" variant="static" />);
    expect(screen.getByTestId("chip").tagName).toBe("SPAN");
    expect(screen.getByText("Price > $5")).toBeInTheDocument();
  });

  it("renders dismissible chips with accessible remove label", () => {
    const onDismiss = vi.fn();
    render(
      <EdgeFilterChip
        label="Setup: breakout"
        data-testid="chip"
        variant="dismissible"
        onDismiss={onDismiss}
      />,
    );

    const button = screen.getByTestId("chip");
    expect(button).toHaveAttribute("aria-label", "Remove Setup: breakout");
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
