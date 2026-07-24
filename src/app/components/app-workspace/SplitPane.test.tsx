import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SplitPane from "./SplitPane";

function mockPaneBounds(pane: HTMLElement, width: number, height: number) {
  vi.spyOn(pane, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("SplitPane", () => {
  it("exposes a wide vertical hit target for row splits", () => {
    render(
      <SplitPane
        splitId="row-1"
        direction="row"
        sizes={[0.5, 0.5]}
        onResizeCommit={vi.fn()}
        first={<div>A</div>}
        second={<div>B</div>}
      />,
    );

    const handle = screen.getByTestId("split-handle-row-1");
    expect(handle).toHaveAttribute("role", "separator");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-label", "Resize panels");
    expect(handle.className).toContain("w-2");
    expect(handle.className).toContain("cursor-col-resize");
  });

  it("exposes a wide horizontal hit target for column splits", () => {
    render(
      <SplitPane
        splitId="col-1"
        direction="column"
        sizes={[0.4, 0.6]}
        onResizeCommit={vi.fn()}
        first={<div>A</div>}
        second={<div>B</div>}
      />,
    );

    const handle = screen.getByTestId("split-handle-col-1");
    expect(handle).toHaveAttribute("aria-orientation", "horizontal");
    expect(handle.className).toContain("h-2");
    expect(handle.className).toContain("cursor-row-resize");
  });

  it("previews flex sizes during drag and commits on pointer up (row)", () => {
    const onResizeCommit = vi.fn();

    render(
      <SplitPane
        splitId="row-drag"
        direction="row"
        sizes={[0.5, 0.5]}
        onResizeCommit={onResizeCommit}
        first={<div data-testid="first">A</div>}
        second={<div data-testid="second">B</div>}
      />,
    );

    const pane = screen.getByTestId("split-pane-row-drag");
    mockPaneBounds(pane, 400, 300);

    const handle = screen.getByTestId("split-handle-row-drag");
    fireEvent.pointerDown(handle, { button: 0, clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 280, pointerId: 1 });

    expect(onResizeCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId("first").parentElement).toHaveStyle({ flex: "0.7 1 0%" });
    expect(screen.getByTestId("second").parentElement).toHaveStyle({ flex: "0.3 1 0%" });

    fireEvent.pointerUp(handle, { clientX: 280, pointerId: 1 });

    expect(onResizeCommit).toHaveBeenCalledTimes(1);
    expect(onResizeCommit).toHaveBeenCalledWith("row-drag", [0.7, 0.3]);
  });

  it("commits vertical resize for column splits", () => {
    const onResizeCommit = vi.fn();

    render(
      <SplitPane
        splitId="col-drag"
        direction="column"
        sizes={[0.5, 0.5]}
        onResizeCommit={onResizeCommit}
        first={<div>A</div>}
        second={<div>B</div>}
      />,
    );

    const pane = screen.getByTestId("split-pane-col-drag");
    mockPaneBounds(pane, 400, 400);

    const handle = screen.getByTestId("split-handle-col-drag");
    fireEvent.pointerDown(handle, { button: 0, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 120, pointerId: 1 });

    expect(onResizeCommit).toHaveBeenCalledWith("col-drag", [0.3, 0.7]);
  });

  it("clamps resize to the minimum fraction", () => {
    const onResizeCommit = vi.fn();

    render(
      <SplitPane
        splitId="clamp"
        direction="row"
        sizes={[0.5, 0.5]}
        onResizeCommit={onResizeCommit}
        first={<div>A</div>}
        second={<div>B</div>}
      />,
    );

    const pane = screen.getByTestId("split-pane-clamp");
    mockPaneBounds(pane, 400, 300);

    const handle = screen.getByTestId("split-handle-clamp");
    fireEvent.pointerDown(handle, { button: 0, clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: -100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: -100, pointerId: 1 });

    expect(onResizeCommit).toHaveBeenCalledWith("clamp", [0.08, 0.92]);
  });
});
