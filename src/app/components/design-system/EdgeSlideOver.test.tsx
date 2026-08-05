import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EdgeSlideOver from "./EdgeSlideOver";
import { PRESENCE_EXIT_MS } from "./usePresence";

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

  it("stays mounted through exit animation before unmounting", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    const onClose = vi.fn();
    const { rerender } = render(
      <EdgeSlideOver open title="Trade detail" onClose={onClose}>
        <div>Panel body</div>
      </EdgeSlideOver>,
    );
    expect(screen.getByTestId("edge-slide-over-panel")).toBeInTheDocument();

    rerender(
      <EdgeSlideOver open={false} title="Trade detail" onClose={onClose}>
        <div>Panel body</div>
      </EdgeSlideOver>,
    );
    expect(screen.getByTestId("edge-slide-over-panel")).toBeInTheDocument();
    expect(screen.getByTestId("edge-slide-over-panel")).toHaveClass("translate-x-full");

    act(() => {
      vi.advanceTimersByTime(PRESENCE_EXIT_MS);
    });
    expect(screen.queryByTestId("edge-slide-over-panel")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("uses ariaLabel when title is not a plain string", () => {
    render(
      <EdgeSlideOver
        open
        title={<span>Rich title</span>}
        ariaLabel="Trade detail panel"
        onClose={vi.fn()}
      >
        <div>Panel body</div>
      </EdgeSlideOver>,
    );
    expect(screen.getByTestId("edge-slide-over-panel")).toHaveAttribute(
      "aria-label",
      "Trade detail panel",
    );
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

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
