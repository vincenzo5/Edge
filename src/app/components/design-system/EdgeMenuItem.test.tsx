/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeMenuItem from "./EdgeMenuItem";

describe("EdgeMenuItem", () => {
  it("renders menuitem role with selected and disabled states", () => {
    const { rerender } = render(
      <EdgeMenuItem label="Daily" selected trailing={<span>⌘ D</span>} />,
    );

    const item = screen.getByRole("menuitem");
    expect(item.className).toContain("surface-active");
    expect(screen.getByText("Daily")).toBeTruthy();
    expect(screen.getByText("⌘ D")).toBeTruthy();

    rerender(
      <EdgeMenuItem label="Daily" disabled disabledReason="Unavailable" trailing={<span>⌘ D</span>} />,
    );
    expect(screen.getByRole("menuitem")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem")).toHaveAttribute("title", "Unavailable");
  });

  it("invokes onClick when enabled", () => {
    const onClick = vi.fn();
    render(<EdgeMenuItem label="Save layout" onClick={onClick} />);
    fireEvent.click(screen.getByRole("menuitem"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks danger rows for styling", () => {
    render(<EdgeMenuItem label="Delete" danger onClick={vi.fn()} />);
    expect(screen.getByRole("menuitem")).toHaveAttribute("data-danger", "true");
  });
});
