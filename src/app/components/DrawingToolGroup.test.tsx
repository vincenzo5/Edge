import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DrawingToolGroup from "./DrawingToolGroup";
import { DRAWING_TOOL_GROUPS } from "./chart-icons/toolGroups";

const linesGroup = DRAWING_TOOL_GROUPS.find((g) => g.id === "lines")!;

describe("DrawingToolGroup", () => {
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const onPin = vi.fn();
  const onUnpin = vi.fn();
  const onSelect = vi.fn();
  const groupButtonName = "Lines — Trend Line";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: coarse)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderGroup(overrides: Partial<ComponentProps<typeof DrawingToolGroup>> = {}) {
    return render(
      <DrawingToolGroup
        theme="dark"
        group={linesGroup}
        selectedTool="straightLine"
        activeTool="__cursor__"
        iconSize={36}
        compact={false}
        disabled={false}
        isOpen={false}
        isPinned={false}
        onOpen={onOpen}
        onClose={onClose}
        onPin={onPin}
        onUnpin={onUnpin}
        onSelect={onSelect}
        {...overrides}
      />,
    );
  }

  it("arms last selection on click when pointer is fine", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(pointer: coarse)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    renderGroup();
    fireEvent.click(screen.getByRole("button", { name: groupButtonName }));
    expect(onSelect).toHaveBeenCalledWith("straightLine");
  });

  it("pins flyout on tap when pointer is coarse", () => {
    renderGroup();
    fireEvent.click(screen.getByRole("button", { name: groupButtonName }));
    expect(onPin).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders flyout menu with a11y roles when open", () => {
    renderGroup({ isOpen: true });
    expect(screen.getByRole("menu", { name: "Lines" })).toBeTruthy();
    expect(screen.getAllByRole("menuitemradio").length).toBe(linesGroup.tools.length);
  });

  it("shows group tooltip when flyout is closed", () => {
    renderGroup();
    fireEvent.mouseEnter(screen.getByRole("button", { name: groupButtonName }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(groupButtonName);
  });

  it("shows group tooltip while flyout is open", () => {
    renderGroup({ isOpen: true });
    fireEvent.mouseEnter(screen.getByRole("button", { name: groupButtonName }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(groupButtonName);
  });

  it("shows tool tooltip on flyout menu item hover", () => {
    renderGroup({ isOpen: true });
    fireEvent.mouseEnter(screen.getByRole("menuitemradio", { name: "Horizontal Line" }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Horizontal Line");
  });

  it("selects tool from menu and closes", () => {
    renderGroup({ isOpen: true, isPinned: true });
    fireEvent.click(screen.getByText("Horizontal Line"));
    expect(onSelect).toHaveBeenCalledWith("horizontalStraightLine");
    expect(onClose).toHaveBeenCalled();
    expect(onUnpin).toHaveBeenCalled();
  });
});
