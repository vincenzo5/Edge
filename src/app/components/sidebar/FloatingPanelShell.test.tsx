import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FloatingPanelShell from "./FloatingPanelShell";

describe("FloatingPanelShell", () => {
  it("renders title, dock, close, and children", () => {
    const onDock = vi.fn();
    const onClose = vi.fn();
    const onGeometryChange = vi.fn();

    render(
      <div className="relative h-[800px] w-[1200px]">
        <FloatingPanelShell
          panelId="watchlist"
          title="Watchlist"
          geometry={{ x: 48, y: 48, width: 480, height: 400 }}
          onGeometryChange={onGeometryChange}
          onDock={onDock}
          onClose={onClose}
        >
          <div data-testid="panel-body">Body</div>
        </FloatingPanelShell>
      </div>,
    );

    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByTestId("panel-body")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("floating-panel-watchlist-dock"));
    expect(onDock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("floating-panel-watchlist-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies popover enter and fade-out exit classes", () => {
    const { rerender } = render(
      <div className="relative h-[800px] w-[1200px]">
        <FloatingPanelShell
          panelId="watchlist"
          title="Watchlist"
          geometry={{ x: 48, y: 48, width: 480, height: 400 }}
          onGeometryChange={vi.fn()}
          onClose={vi.fn()}
          visible
        >
          <div>Body</div>
        </FloatingPanelShell>
      </div>,
    );

    const panel = screen.getByTestId("floating-panel-watchlist");
    expect(panel.className).toContain("edge-popover-enter");
    expect(panel).toHaveAttribute("data-floating-visible", "true");

    rerender(
      <div className="relative h-[800px] w-[1200px]">
        <FloatingPanelShell
          panelId="watchlist"
          title="Watchlist"
          geometry={{ x: 48, y: 48, width: 480, height: 400 }}
          onGeometryChange={vi.fn()}
          onClose={vi.fn()}
          visible={false}
        >
          <div>Body</div>
        </FloatingPanelShell>
      </div>,
    );
    expect(panel.className).toContain("opacity-0");
    expect(panel).toHaveAttribute("data-floating-visible", "false");
  });

  it("ignores Escape while exiting", () => {
    const onClose = vi.fn();
    render(
      <div className="relative h-[800px] w-[1200px]">
        <FloatingPanelShell
          panelId="watchlist"
          title="Watchlist"
          geometry={{ x: 48, y: 48, width: 480, height: 400 }}
          onGeometryChange={vi.fn()}
          onClose={onClose}
          visible={false}
        >
          <div>Body</div>
        </FloatingPanelShell>
      </div>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
