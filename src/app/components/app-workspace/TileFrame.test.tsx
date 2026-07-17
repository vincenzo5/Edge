import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TileFrame from "./TileFrame";

describe("TileFrame", () => {
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
    fireEvent.change(screen.getByTestId("tile-reassign-tile-1"), {
      target: { value: "journal" },
    });
    expect(onReassign).toHaveBeenCalledWith("journal");
  });
});
