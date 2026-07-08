import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeSlideOver from "./EdgeSlideOver";

describe("EdgeSlideOver", () => {
  it("renders dialog when open", () => {
    render(
      <EdgeSlideOver open title="Trade detail" onClose={vi.fn()}>
        <div>Panel body</div>
      </EdgeSlideOver>,
    );
    expect(screen.getByTestId("edge-slide-over-panel")).toHaveAttribute("role", "dialog");
    expect(screen.getByText("Trade detail")).toBeInTheDocument();
    expect(screen.getByText("Panel body")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <EdgeSlideOver open={false} title="Trade detail" onClose={vi.fn()}>
        <div>Panel body</div>
      </EdgeSlideOver>,
    );
    expect(screen.queryByTestId("edge-slide-over-panel")).not.toBeInTheDocument();
  });

  it("calls onClose from backdrop, close button, and Escape", () => {
    const onClose = vi.fn();
    render(
      <EdgeSlideOver open title="Trade detail" onClose={onClose}>
        <div>Panel body</div>
      </EdgeSlideOver>,
    );

    fireEvent.click(screen.getByTestId("edge-slide-over-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("edge-slide-over-close"));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
