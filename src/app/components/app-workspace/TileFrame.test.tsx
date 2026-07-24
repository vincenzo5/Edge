/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TileFrame from "./TileFrame";

describe("TileFrame", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("hides tile header in use mode", () => {
    render(
      <TileFrame
        tileId="tile-1"
        surfaceId="chart"
        active
        editMode={false}
        onFocus={vi.fn()}
        canClose={false}
      >
        <div>content</div>
      </TileFrame>,
    );
    expect(screen.queryByTestId("tile-header-tile-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("tile-frame-tile-1")).toHaveAttribute("data-edit-mode", "false");
    expect(screen.getByTestId("tile-density-root")).toBeInTheDocument();
  });

  it("shows an overlay active ring in use mode for chart and other surfaces", () => {
    const { rerender } = render(
      <TileFrame
        tileId="chart-1"
        surfaceId="chart"
        active
        editMode={false}
        onFocus={vi.fn()}
        canClose={false}
      >
        <div className="h-full bg-black">opaque chart surface</div>
      </TileFrame>,
    );
    expect(screen.getByTestId("tile-frame-chart-1")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("tile-active-ring-chart-1")).toBeInTheDocument();

    rerender(
      <TileFrame
        tileId="chart-1"
        surfaceId="chart"
        active={false}
        editMode={false}
        onFocus={vi.fn()}
        canClose={false}
      >
        <div>content</div>
      </TileFrame>,
    );
    expect(screen.getByTestId("tile-frame-chart-1")).toHaveAttribute("data-active", "false");
    expect(screen.queryByTestId("tile-active-ring-chart-1")).not.toBeInTheDocument();
  });

  it("uses border highlight in edit mode instead of overlay ring", () => {
    render(
      <TileFrame
        tileId="tile-1"
        surfaceId="screener"
        active
        editMode
        onFocus={vi.fn()}
        canClose={false}
      >
        <div>content</div>
      </TileFrame>,
    );
    expect(screen.queryByTestId("tile-active-ring-tile-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("tile-frame-tile-1").className).toContain(
      "border-[var(--edge-accent-blue)]",
    );
  });

  it("shows tile header and close in edit mode", () => {
    const onClose = vi.fn();
    render(
      <TileFrame
        tileId="tile-1"
        surfaceId="chart"
        active
        editMode
        onFocus={vi.fn()}
        onClose={onClose}
        canClose
      >
        <div>content</div>
      </TileFrame>,
    );
    expect(screen.getByTestId("tile-header-tile-1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tile-close-tile-1"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows reassign select for filled tiles in edit mode", () => {
    const onReassign = vi.fn();
    render(
      <TileFrame
        tileId="tile-1"
        surfaceId="chart"
        active
        editMode
        onFocus={vi.fn()}
        onReassign={onReassign}
        canClose={false}
      >
        <div>content</div>
      </TileFrame>,
    );
    fireEvent.click(screen.getByTestId("tile-reassign-tile-1"));
    fireEvent.click(screen.getByTestId("tile-reassign-tile-1-option-journal"));
    expect(onReassign).toHaveBeenCalledWith("journal");
  });
});
